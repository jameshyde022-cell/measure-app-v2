import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getAuthSecret } from '../../../../lib/authSecret'

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
    const SECRET = getAuthSecret()
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

export async function POST(request) {
  const email = await getEmailFromRequest(request)
  if (!email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
    // Force live reads: supabase-js goes through the global fetch, which
    // Next.js/Vercel caches by default. Bypass the Data Cache.
    { global: { fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }) } }
  )

  const { data: sub } = await supabase
    .from('subscribers')
    .select('stripe_subscription_id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (!sub?.stripe_subscription_id) {
    return Response.json({ error: 'No active subscription found.' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  console.log('[profile/cancel] Subscription set to cancel at period end for:', email)
  return Response.json({ ok: true })
}
