import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { getEnv } from '@/lib/env';

export async function POST(req: Request) {
  const { uid, email } = await req.json();
  const { STRIPE_PRICE_ID, APP_URL } = getEnv();
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    success_url: `${APP_URL}/dashboard?sub=success`,
    cancel_url: `${APP_URL}/pricing?canceled=1`,
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    customer_email: email,
    metadata: { uid },
  });
  return NextResponse.json({ url: session.url });
}
