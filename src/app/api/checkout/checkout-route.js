import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const PRICE_ID = process.env.STRIPE_PRICE_ID;
const AFFILIATE_COUPON_ID = 'Ag7Ld0Fp'; // 1 month free (100% off once)

export async function POST(req) {
  try {
    const { email, referralCode } = await req.json();

    let influencer = null;

    // If a referral code was provided, look it up
    if (referralCode) {
      const normalized = referralCode.toUpperCase().replace(/\s+/g, '');
      const { data } = await supabase
        .from('influencers')
        .select('*')
        .eq('code', normalized)
        .single();

      if (data) influencer = data;
    }

    // Build Stripe checkout session
    const sessionParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        referral_code: influencer?.code || '',
        influencer_id: influencer?.id || '',
      },
    };

    if (email) sessionParams.customer_email = email;

    // Apply 1 month free coupon + track referral if valid influencer code
    if (influencer) {
      sessionParams.discounts = [{ coupon: AFFILIATE_COUPON_ID }];
      sessionParams.subscription_data = {
        metadata: {
          referral_code: influencer.code,
          influencer_id: influencer.id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Log the referral in Supabase (pending until payment confirmed)
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
