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
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = (session.metadata?.uid as string) || '';
      const customerId = (session.customer as string) || '';
      const subscriptionId = (session.subscription as string) || '';
      if (uid && customerId) {
        await supabaseAdmin
          .from('stripe_customers')
          .upsert({ uid, stripe_customer_id: customerId });
      }
      if (uid && subscriptionId) {
        try {
          const sub = (await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.price'] })) as unknown as Stripe.Subscription;
          const price = sub.items.data[0]?.price as Stripe.Price | undefined;
          const priceId = price?.id || '';
          await supabaseAdmin
            .from('subscriptions')
            .upsert({
              uid,
              stripe_subscription_id: subscriptionId,
              plan_id: priceId,
              status: sub.status,
              current_period_end: new Date((((sub as unknown) as { current_period_end?: number }).current_period_end || 0) * 1000).toISOString(),
            }, { onConflict: 'stripe_subscription_id' });
        } catch {}
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = (sub.customer as string) || '';
      const price = sub.items.data[0]?.price as Stripe.Price | undefined;
      const priceId = price?.id || '';
      // Find uid for this customer
      let uid = '';
      try {
        const { data } = await supabaseAdmin
          .from('stripe_customers')
          .select('uid')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        uid = data?.uid || '';
      } catch {}
      if (!uid) {
        // Backfill by customer email if present
        try {
          const cust = await stripe.customers.retrieve(customerId);
          const email = (cust as unknown as { email?: string })?.email;
          if (email) {
            const { data: user } = await supabaseAdmin.from('users').select('uid').eq('email', email).maybeSingle();
            if (user?.uid) {
              uid = user.uid;
              await supabaseAdmin.from('stripe_customers').upsert({ uid, stripe_customer_id: customerId });
            }
          }
        } catch {}
      }
      if (uid) {
        await supabaseAdmin
          .from('subscriptions')
          .upsert({
            uid,
            stripe_subscription_id: sub.id,
            plan_id: priceId,
            status: sub.status,
            current_period_end: new Date((((sub as unknown) as { current_period_end?: number }).current_period_end || 0) * 1000).toISOString(),
          }, { onConflict: 'stripe_subscription_id' });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
