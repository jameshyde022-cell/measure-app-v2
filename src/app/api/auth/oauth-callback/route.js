import { createClient } from '@supabase/supabase-js'

const SECRET = process.env.AUTH_SECRET ?? 'measure-dev-secret-replace-in-prod'

async function makeSessionToken(email) {
  const payload = JSON.stringify({ email, iat: Date.now() })
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return btoa(payload) + '.' + btoa(String.fromCharCode(...new Uint8Array(sig)))
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { email, accessToken } = body
  const normalizedEmail = email?.toLowerCase().trim()

  if (!normalizedEmail || !accessToken) {
    return Response.json({ error: 'Missing email or token.' }, { status: 400 })
  }

  // Verify the access token with Supabase to ensure it's legitimate
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !userData?.user || userData.user.email?.toLowerCase() !== normalizedEmail) {
    console.error('[oauth-callback] Token verification failed:', userError?.message)
    return Response.json({ error: 'Invalid session.' }, { status: 401 })
  }

  // Ensure subscriber record exists
  const { data: existing } = await supabase
    .from('subscribers')
    .select('email')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (!existing) {
    const { error: insertError } = await supabase.from('subscribers').insert({
      email: normalizedEmail,
      is_pro: false,
      email_marketing_consent: true,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    })
    if (insertError) {
      console.error('[oauth-callback] Failed to create subscriber:', insertError.message)
    }
  } else {
    await supabase
      .from('subscribers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('email', normalizedEmail)
  }

  let token
  try {
    token = await makeSessionToken(normalizedEmail)
  } catch (err) {
    console.error('[oauth-callback] Token signing failed:', err)
    return Response.json({ error: 'Failed to create session.' }, { status: 500 })
  }

  const isProd = process.env.NODE_ENV === 'production'
  const cookie = [
    `measure_session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${30 * 24 * 60 * 60}`,
    isProd ? 'Secure' : '',
  ].filter(Boolean).join('; ')

  console.log('[oauth-callback] Session created for:', normalizedEmail)
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
  })
}
