import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const PRICE_ID_MONTHLY = process.env.STRIPE_PRICE_ID;
// TODO: Create a yearly price in your Stripe dashboard (Products → your product → Add price →
// Recurring, every year, $19.95) then add STRIPE_PRICE_ID_YEARLY=price_xxxx to your env vars.
const PRICE_ID_YEARLY = process.env.STRIPE_PRICE_ID_YEARLY;

const AFFILIATE_COUPON_ID = process.env.STRIPE_AFFILIATE_COUPON_ID || 'Ag7Ld0Fp'; // 1 month free (100% off once)

export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
    // Force live reads: supabase-js goes through the global fetch, which
    // Next.js/Vercel caches by default. Bypass the Data Cache.
    { global: { fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }) } }
  );
  try {
    const { email, referralCode, plan } = await req.json();

    const isYearly = plan === 'yearly';
    const priceId = isYearly ? PRICE_ID_YEARLY : PRICE_ID_MONTHLY;

    if (!priceId) {
      const msg = isYearly
        ? 'Yearly plan is not yet configured. Please contact support or choose the monthly plan.'
        : 'Monthly plan price is not configured.';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    let influencer = null;

    if (referralCode) {
      const normalized = referralCode.toUpperCase().replace(/\s+/g, '');
      const { data } = await supabase
        .from('influencers')
        .select('*')
        .eq('code', normalized)
        .single();

      if (data) influencer = data;
    }

    const sessionParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        plan: isYearly ? 'yearly' : 'monthly',
        referral_code: influencer?.code || '',
        influencer_id: influencer?.id || '',
      },
    };

    if (email) sessionParams.customer_email = email;

    // 14-day free trial on both plans. Card is collected up front
    // (payment_method_collection defaults to 'always'); the first charge
    // happens when the trial ends. Cancel anytime during the trial.
    sessionParams.subscription_data = { trial_period_days: 14 };

    // Apply referral coupon — only on monthly; yearly already carries a large discount
    if (influencer && !isYearly) {
      sessionParams.discounts = [{ coupon: AFFILIATE_COUPON_ID }];
      sessionParams.subscription_data = {
        ...sessionParams.subscription_data,
        metadata: {
          referral_code: influencer.code,
          influencer_id: influencer.id,
        },
      };
    } else if (influencer && isYearly) {
      sessionParams.subscription_data = {
        ...sessionParams.subscription_data,
        metadata: {
          referral_code: influencer.code,
          influencer_id: influencer.id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (influencer) {
      await supabase.from('referrals').insert({
        influencer_id: influencer.id,
        referral_email: email || null,
        status: 'pending',
        commission_cents: 300,
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
