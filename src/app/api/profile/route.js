import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const SECRET = process.env.AUTH_SECRET ?? 'measure-dev-secret-replace-in-prod'

async function getEmailFromRequest(request) {
  const token = request.cookies.get('measure_session')?.value
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [payloadB64, sigB64] = parts
    const payload = atob(payloadB64)
    const data = JSON.parse(payload)
    if (!data.iat || Date.now() - data.iat > 30 * 24 * 60 * 60 * 1000) return null
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig)))
    if (expectedSig !== sigB64) return null
    return data.email ?? null
  } catch {
    return null
  }
}

export async function GET(request) {
  const email = await getEmailFromRequest(request)
  if (!email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  )

  const { data: sub } = await supabase
    .from('subscribers')
    .select('is_pro, pro_trial_expires_at, referral_code, referral_count, paid_referral_count, referral_reward_applied, stripe_subscription_id, billing_cycle')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  let isPro = sub?.is_pro === true
  let isTrial = false
  if (isPro && sub?.pro_trial_expires_at) {
    if (new Date(sub.pro_trial_expires_at) < new Date()) {
      isPro = false
      await supabase.from('subscribers').update({ is_pro: false }).eq('email', email.toLowerCase())
    } else {
      isTrial = true
    }
  }

  // Fetch live Stripe subscription data
  let stripeInfo = null
  if (sub?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      stripeInfo = {
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        billing_cycle: subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      }
    } catch (err) {
      console.error('[profile] Stripe subscription fetch error:', err.message)
    }
  }

  // Referral stats from user_referrals table (authoritative) with fallback to subscriber counts
  const { data: referrals } = await supabase
    .from('user_referrals')
    .select('converted_to_paid')
    .eq('referrer_email', email.toLowerCase())

  const referralCount = referrals?.length ?? sub?.referral_count ?? 0
  const paidReferralCount = referrals?.filter(r => r.converted_to_paid).length ?? sub?.paid_referral_count ?? 0

  return Response.json({
    email,
    is_pro: isPro,
    is_trial: isTrial,
    trial_expires_at: sub?.pro_trial_expires_at || null,
    referral_code: sub?.referral_code || null,
    referral_count: referralCount,
    paid_referral_count: paidReferralCount,
    referral_reward_applied: sub?.referral_reward_applied || false,
    stripe: stripeInfo,
    has_subscription: !!sub?.stripe_subscription_id,
  })
}
