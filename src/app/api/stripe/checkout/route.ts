import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { ENV } from '@/lib/env';

export async function POST(req: Request) {
  const { uid, email } = await req.json();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    success_url: `${ENV.APP_URL}/dashboard?sub=success`,
    cancel_url: `${ENV.APP_URL}/pricing?canceled=1`,
    line_items: [{ price: ENV.STRIPE_PRICE_ID, quantity: 1 }],
    customer_email: email,
    metadata: { uid },
  });
  return NextResponse.json({ url: session.url });
}
