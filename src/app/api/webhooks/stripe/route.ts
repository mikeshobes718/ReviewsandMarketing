import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { ENV } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const hdrs = await headers();
  const sig = hdrs.get('stripe-signature') || '';
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, ENV.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  const id = event.id as string;
  const { data: existing } = await supabaseAdmin
    .from('webhook_events').select('id').eq('id', id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  await supabaseAdmin.from('webhook_events').insert({
    id,
    type: event.type,
    payload: event as unknown,
  });

  switch (event.type) {
    case 'checkout.session.completed': {
      // TODO: handle subscription activation mapping
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      // TODO: upsert subscription state
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
