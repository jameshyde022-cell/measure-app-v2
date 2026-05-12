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
    console.error('[webhook] Signature error:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Grant pro access and store Stripe IDs when checkout completes
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = (session.customer_details?.email || session.customer_email)?.toLowerCase();
    if (email) {
      const billingCycle = session.metadata?.plan === 'yearly' ? 'yearly' : 'monthly';
      await supabase
        .from('subscribers')
        .upsert({
          email,
          is_pro: true,
          stripe_customer_id: session.customer || null,
          stripe_subscription_id: session.subscription || null,
          billing_cycle: billingCycle,
          pro_trial_expires_at: null, // clear any trial once paid
        }, { onConflict: 'email' });
      console.log('[webhook] Pro granted to:', email);
    }
  }

  // Update period end when subscription renews or updates
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    // Look up the subscriber by customer ID
    const { data: sub } = await supabase
      .from('subscribers')
      .select('email, referred_by')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (sub) {
      await supabase
        .from('subscribers')
        .update({
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          stripe_subscription_id: subscription.id,
        })
        .eq('email', sub.email);

      // On new subscription creation, handle user referral reward
      if (event.type === 'customer.subscription.created' && sub.referred_by) {
        // Mark the referral as converted
        const { data: referral } = await supabase
          .from('user_referrals')
          .select('id, converted_to_paid')
          .eq('referred_email', sub.email)
          .eq('converted_to_paid', false)
          .maybeSingle();

        if (referral) {
          await supabase
            .from('user_referrals')
            .update({ converted_to_paid: true, converted_at: new Date().toISOString() })
            .eq('id', referral.id);

          await supabase.rpc('increment_paid_referral_count', { p_email: sub.referred_by });
          console.log('[webhook] Paid referral counted for referrer:', sub.referred_by);
        }
      }
    }

    // Also handle influencer referral conversions (existing system)
    const influencerId = subscription.metadata?.influencer_id;
    const referralCode = subscription.metadata?.referral_code;
    if (event.type === 'customer.subscription.created' && influencerId && referralCode) {
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

  // Downgrade when subscription is cancelled/deleted
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const { data: sub } = await supabase
      .from('subscribers')
      .select('email')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();

    if (sub) {
      await supabase
        .from('subscribers')
        .update({ is_pro: false, stripe_subscription_id: null })
        .eq('email', sub.email);
      console.log('[webhook] Pro revoked for:', sub.email);
    }
  }

  return NextResponse.json({ received: true });
}
