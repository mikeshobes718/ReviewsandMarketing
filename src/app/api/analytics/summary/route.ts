import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getStripeClient } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function startOfUTCDay(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export async function GET() {
  const since = startOfUTCDay();
  const sinceISO = since.toISOString();
  const supa = getSupabaseAdmin();
  const stripe = getStripeClient();

  const channels = ['qr', 'whatsapp', 'sms', 'email', 'link'];
  const clicksByChannel: Record<string, number> = Object.fromEntries(channels.map(c => [c, 0]));
  let totalClicks = 0;

  // Count clicks today grouped by channel (fetch and aggregate in app to keep SQL simple)
  try {
    type ClickRow = { slug: string; ts: string };
    type LinkRow = { slug: string; channel: string };
    const clicks = await supa
      .from('short_clicks')
      .select('slug, ts')
      .gte('ts', sinceISO)
      .limit(20000);
    if (!clicks.error && clicks.data) {
      const clicksData = clicks.data as ClickRow[];
      const slugs = Array.from(new Set(clicksData.map((r) => r.slug)));
      const links = await supa
        .from('short_links')
        .select('slug, channel')
        .in('slug', slugs);
      const bySlug = new Map<string, string>();
      if (!links.error && links.data) {
        (links.data as LinkRow[]).forEach(({ slug, channel }) => bySlug.set(slug, channel));
      }
      clicksData.forEach((row) => {
        const ch = bySlug.get(row.slug) || 'link';
        if (clicksByChannel[ch] === undefined) clicksByChannel[ch] = 0;
        clicksByChannel[ch] += 1;
        totalClicks += 1;
      });
    }
  } catch {}

  // New businesses created today
  let newBusinesses = 0;
  try {
    const biz = await supa
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sinceISO);
    newBusinesses = biz.count || 0;
  } catch {}

  // Stripe revenue today (sum of succeeded charges)
  let revenueUSD = 0;
  try {
    const createdGte = Math.floor(since.getTime() / 1000);
    // Limit to first 100 objects; adequate for daily summary
    const charges = await stripe.charges.list({ limit: 100, created: { gte: createdGte } });
    for (const ch of charges.data) {
      if (ch.paid && ch.status === 'succeeded') {
        revenueUSD += (ch.amount || 0) / 100;
      }
    }
  } catch {}

  return NextResponse.json({
    since: sinceISO,
    clicksByChannel,
    totalClicks,
    newBusinesses,
    revenueUSD,
  });
}
