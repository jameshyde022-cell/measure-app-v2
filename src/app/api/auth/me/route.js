import { createClient } from '@supabase/supabase-js'
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

export async function GET(request) {
  const email = await getEmailFromRequest(request)
  if (!email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  )

  const { data } = await supabase
    .from('subscribers')
    .select('is_pro, pro_trial_expires_at, referral_code')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  let isPro = data?.is_pro === true

  // Expire trial if past the deadline
  if (isPro && data?.pro_trial_expires_at) {
    if (new Date(data.pro_trial_expires_at) < new Date()) {
      isPro = false
      await supabase
        .from('subscribers')
        .update({ is_pro: false })
        .eq('email', email.toLowerCase())
    }
  }

  return Response.json({
    email,
    pro: isPro,
    referral_code: data?.referral_code || null,
  })
}
