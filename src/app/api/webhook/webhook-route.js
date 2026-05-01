import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  );
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Grant pro access when checkout completes
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;
    if (email) {
      await supabase
        .from('subscribers')
        .upsert({ email: email.toLowerCase(), is_pro: true }, { onConflict: 'email' });
    }
  }

  // Track referral conversions when a subscription is created
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    const influencerId = subscription.metadata?.influencer_id;
    const referralCode = subscription.metadata?.referral_code;

    if (influencerId && referralCode) {
      await supabase
        .from('referrals')
        .update({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          status: 'converted',
        })
        .eq('influencer_id', influencerId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      await supabase.rpc('increment_earnings', {
        influencer_id: influencerId,
        amount: 300,
      });
    }
  }

  return NextResponse.json({ received: true });
}
