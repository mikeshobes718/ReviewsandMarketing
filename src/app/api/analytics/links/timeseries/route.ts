import { NextResponse } from 'next/server';
import { requireUid } from '@/lib/authServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthAdmin } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function getUidFromRequest(req: Request): Promise<string> {
  try {
    return await requireUid();
  } catch {}
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : undefined;
  if (!token) throw new Error('unauthenticated');
  const decoded = await getAuthAdmin().verifyIdToken(token);
  return decoded.uid;
}

export async function GET(req: Request) {
  let uid: string;
  try {
    uid = await getUidFromRequest(req);
  } catch {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const daysParam = Number(searchParams.get('days') || 30);
  const days = Math.max(1, Math.min(90, isNaN(daysParam) ? 30 : daysParam));

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const labels: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    labels.push(isoDay(d));
  }

  const supa = getSupabaseAdmin();

  // Fetch user's business ids
  const biz = await supa.from('businesses').select('id').eq('owner_uid', uid);
  if (biz.error) {
    return new NextResponse(biz.error.message, { status: 500 });
  }
  const ids = (biz.data || []).map(b => b.id);
  if (ids.length === 0) {
    return NextResponse.json({ labels, series: {}, totals: {} });
  }

  // Their short links and channels
  const links = await supa.from('short_links')
    .select('slug,channel')
    .in('business_id', ids);
  if (links.error) {
    // If table doesn't exist yet, return empty data gracefully
    return NextResponse.json({ labels, series: {}, totals: {} });
  }
  const bySlug = new Map<string, string>();
  type LinkRow = { slug: string; channel: string };
  (links.data as LinkRow[] | null || []).forEach((r) => bySlug.set(r.slug, r.channel));

  const slugs = Array.from(bySlug.keys());
  if (slugs.length === 0) {
    return NextResponse.json({ labels, series: {}, totals: {} });
  }

  // Clicks since 'since'
  const clicks = await supa.from('short_clicks')
    .select('slug,ts')
    .in('slug', slugs)
    .gte('ts', since.toISOString());
  if (clicks.error) {
    return NextResponse.json({ labels, series: {}, totals: {} });
  }

  const channels = ['qr', 'whatsapp', 'sms', 'email', 'link'];
  const series: Record<string, number[]> = Object.fromEntries(channels.map(c => [c, labels.map(() => 0)]));
  const totals: Record<string, number> = Object.fromEntries(channels.map(c => [c, 0]));

  type ClickRow = { slug: string; ts: string };
  (clicks.data as ClickRow[] | null || []).forEach((row) => {
    const day = isoDay(new Date(row.ts));
    const idx = labels.indexOf(day);
    if (idx === -1) return;
    const ch = bySlug.get(row.slug) || 'link';
    if (!(ch in series)) return;
    series[ch][idx] += 1;
    totals[ch] = (totals[ch] || 0) + 1;
  });

  return NextResponse.json({ labels, series, totals });
}


