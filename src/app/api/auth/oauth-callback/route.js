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

  const { code } = body
  if (!code) {
    return Response.json({ error: 'Missing auth code.' }, { status: 400 })
  }

  // Read the PKCE code_verifier from the HttpOnly cookie set by /api/auth/google
  const verifier = request.cookies.get('oauth_verifier')?.value
  if (!verifier) {
    console.error('[oauth-callback] oauth_verifier cookie missing')
    return Response.json({ error: 'Session expired. Please try signing in again.' }, { status: 400 })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[oauth-callback] Missing Supabase credentials')
    return Response.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  // Exchange code + verifier for tokens via Supabase PKCE endpoint directly
  const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({
      auth_code: code,
      code_verifier: verifier,
    }),
  })

  const tokenData = await tokenRes.json().catch(() => ({}))

  if (!tokenRes.ok) {
    console.error('[oauth-callback] PKCE exchange failed:', tokenRes.status, JSON.stringify(tokenData))
    return Response.json({
      error: tokenData.error_description || tokenData.message || 'Token exchange failed.',
    }, { status: 401 })
  }

  const email = tokenData.user?.email?.toLowerCase().trim()
  if (!email) {
    console.error('[oauth-callback] No email in token response:', JSON.stringify(tokenData))
    return Response.json({ error: 'No email returned from provider.' }, { status: 400 })
  }

  // Ensure subscriber record exists
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const { data: existing } = await supabase
    .from('subscribers')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  if (!existing) {
    const { error: insertError } = await supabase.from('subscribers').insert({
      email,
      is_pro: false,
      email_marketing_consent: true,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    })
    if (insertError) {
      console.error('[oauth-callback] Failed to create subscriber:', insertError.message)
    } else {
      console.log('[oauth-callback] Created subscriber for:', email)
    }
  } else {
    await supabase
      .from('subscribers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('email', email)
  }

  let token
  try {
    token = await makeSessionToken(email)
  } catch (err) {
    console.error('[oauth-callback] Token signing failed:', err)
    return Response.json({ error: 'Failed to create session.' }, { status: 500 })
  }

  const isProd = process.env.NODE_ENV === 'production'
  const sessionCookie = [
    `measure_session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${30 * 24 * 60 * 60}`,
    isProd ? 'Secure' : '',
  ].filter(Boolean).join('; ')

  // Clear the verifier cookie
  const clearVerifier = 'oauth_verifier=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'

  console.log('[oauth-callback] Session created for:', email)
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': [sessionCookie, clearVerifier].join(', '),
    },
  })
}
