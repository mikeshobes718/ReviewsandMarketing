import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getPostmarkClient } from '@/lib/postmark';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHANNELS = ['qr','whatsapp','sms','email','link'] as const;

export async function POST(req: Request) {
  const token = req.headers.get('x-cron-token') || req.headers.get('X-Cron-Token') || '';
  if (!token || token !== process.env.CRON_DIGEST_TOKEN) {
    return new NextResponse('forbidden', { status: 403 });
  }

  const { APP_URL, EMAIL_FROM } = getEnv();
  const supa = getSupabaseAdmin();
  const postmark = getPostmarkClient();

  const sinceIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // Load users and businesses
  const bizRows = await supa.from('businesses').select('id,owner_uid');
  if (bizRows.error) return new NextResponse(bizRows.error.message, { status: 500 });
  const userRows = await supa.from('users').select('uid,email');
  if (userRows.error) return new NextResponse(userRows.error.message, { status: 500 });

  const emailByUid = new Map<string,string>((userRows.data||[]).map(u => [u.uid, u.email]));
  const bizByOwner = new Map<string,string[]>();
  (bizRows.data||[]).forEach(b => {
    const arr = bizByOwner.get(b.owner_uid) || [];
    arr.push(b.id);
    bizByOwner.set(b.owner_uid, arr);
  });

  const allBizIds = (bizRows.data||[]).map(b => b.id);
  if (allBizIds.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const links = await supa.from('short_links').select('slug,channel,business_id').in('business_id', allBizIds);
  if (links.error) return NextResponse.json({ ok: true, sent: 0 });

  const slugsByOwner = new Map<string, { slug: string, channel: string }[]>();
  (links.data||[]).forEach(r => {
    for (const [uid, ids] of bizByOwner.entries()) {
      if (ids.includes(r.business_id)) {
        const arr = slugsByOwner.get(uid) || [];
        arr.push({ slug: r.slug, channel: r.channel });
        slugsByOwner.set(uid, arr);
      }
    }
  });

  const allSlugs = (links.data||[]).map(r => r.slug);
  type ClickRow = { slug: string };
  const clicksRes = allSlugs.length
    ? await supa.from('short_clicks').select('slug').in('slug', allSlugs).gte('ts', sinceIso)
    : { data: [] as ClickRow[] | null, error: null } as const;
  if ('error' in clicksRes && clicksRes.error) return new NextResponse(String(clicksRes.error.message || clicksRes.error), { status: 500 });

  const clicksBySlug = new Map<string, number>();
  const withData = clicksRes as { data: ClickRow[] | null };
  const clicksData: ClickRow[] = Array.isArray(withData.data) ? withData.data : [];
  clicksData.forEach((c) => {
    clicksBySlug.set(c.slug, (clicksBySlug.get(c.slug) || 0) + 1);
  });

  let sent = 0;
  for (const [uid, arr] of slugsByOwner.entries()) {
    const email = emailByUid.get(uid);
    if (!email) continue;
    const totals: Record<string, number> = Object.fromEntries(CHANNELS.map(c => [c, 0]));
    arr.forEach(({ slug, channel }) => {
      const n = clicksBySlug.get(slug) || 0;
      totals[channel] = (totals[channel] || 0) + n;
    });
    const total = CHANNELS.reduce((s, c) => s + (totals[c]||0), 0);

    await postmark.sendEmailWithTemplate({
      From: EMAIL_FROM,
      To: email,
      TemplateAlias: 'daily-digest',
      TemplateModel: {
        product_name: 'Reviews & Marketing',
        dashboard_url: `${APP_URL}/dashboard`,
        qr: totals.qr || 0,
        whatsapp: totals.whatsapp || 0,
        sms: totals.sms || 0,
        email: totals.email || 0,
        link: totals.link || 0,
        total,
      },
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}


