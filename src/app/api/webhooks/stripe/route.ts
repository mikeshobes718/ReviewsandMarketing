import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripeClient } from '@/lib/stripe';
import { getEnv } from '@/lib/env';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature') || '';
  const raw = await req.text();

  const stripe = getStripeClient();
  const { STRIPE_WEBHOOK_SECRET } = getEnv();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  const id = event.id as string;
  const supabaseAdmin = getSupabaseAdmin();
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
