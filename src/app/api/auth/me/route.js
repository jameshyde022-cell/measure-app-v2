import { createClient } from '@supabase/supabase-js'

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
  console.log('[auth/me] extracted email:', email)

  if (!email) {
    console.log('[auth/me] no valid session cookie — returning 401')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  )

  const { data, error } = await supabase
    .from('subscribers')
    .select('is_pro')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  console.log('[auth/me] supabase query for:', email.toLowerCase())
  console.log('[auth/me] supabase data:', JSON.stringify(data))
  console.log('[auth/me] supabase error:', JSON.stringify(error))

  const result = { email, pro: data?.is_pro === true }
  console.log('[auth/me] returning:', JSON.stringify(result))

  return Response.json(result)
}
