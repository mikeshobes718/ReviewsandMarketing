import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { getEnv } from '@/lib/env';
import { requireUid } from '@/lib/authServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const plan = (body?.plan as 'monthly'|'yearly') || 'monthly';
  // Prefer authenticated uid/email from server if available
  let uid = '';
  let email = '';
  try {
    uid = await requireUid();
    const supa = getSupabaseAdmin();
    const row = await supa.from('users').select('email').eq('uid', uid).maybeSingle();
    email = row.data?.email || '';
  } catch {
    uid = body?.uid || 'anon';
    email = body?.email || '';
  }
  const { STRIPE_PRICE_ID, STRIPE_YEARLY_PRICE_ID, APP_URL } = getEnv();
  const stripe = getStripeClient();
  const priceId = plan === 'yearly' && STRIPE_YEARLY_PRICE_ID ? STRIPE_YEARLY_PRICE_ID : STRIPE_PRICE_ID;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    success_url: `${APP_URL}/dashboard?sub=success`,
    cancel_url: `${APP_URL}/pricing?canceled=1`,
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email || undefined,
    metadata: { uid, plan },
    client_reference_id: uid || undefined,
  });
  return NextResponse.json({ url: session.url });
}
