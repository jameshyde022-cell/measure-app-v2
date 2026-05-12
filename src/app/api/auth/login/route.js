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

  const { email, password } = body
  const normalizedEmail = email?.toLowerCase().trim()

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
  }
  if (!password) {
    return Response.json({ error: 'Password is required.' }, { status: 400 })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  // Authenticate with Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (authError) {
    console.error('[auth/login] Supabase error:', authError.message)
    if (authError.message.toLowerCase().includes('email not confirmed')) {
      return Response.json(
        { error: 'Please check your email to verify your account before continuing.', unverified: true },
        { status: 403 }
      )
    }
    return Response.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  const user = authData?.user
  if (!user) {
    return Response.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  if (!user.email_confirmed_at) {
    return Response.json(
      { error: 'Please check your email to verify your account before continuing.', unverified: true },
      { status: 403 }
    )
  }

  // Ensure subscriber record exists; create on first verified login
  const { data: existing } = await supabase
    .from('subscribers')
    .select('email, referral_code')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (!existing) {
    const referralCode = user.user_metadata?.referral_code
    const marketingConsent = user.user_metadata?.marketing_consent !== false
    const insertData = {
      email: normalizedEmail,
      is_pro: false,
      email_marketing_consent: marketingConsent,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    }

    if (referralCode) {
      const { data: referrer } = await supabase
        .from('subscribers')
        .select('email')
        .eq('referral_code', referralCode)
        .maybeSingle()

      if (referrer && referrer.email !== normalizedEmail) {
        insertData.is_pro = true
        insertData.pro_trial_expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        insertData.referred_by = referrer.email

        await supabase.from('user_referrals').insert({
          referrer_email: referrer.email,
          referred_email: normalizedEmail,
        })
        await supabase.rpc('increment_user_referral_count', { p_email: referrer.email })
        console.log('[auth/login] Referral applied from', referrer.email, 'to', normalizedEmail)
      }
    }

    const { error: insertError } = await supabase.from('subscribers').insert(insertData)
    if (insertError) {
      console.error('[auth/login] Failed to create subscriber:', insertError.message)
    }
  } else {
    await supabase
      .from('subscribers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('email', normalizedEmail)
  }

  // Issue custom session cookie (keeps all existing API routes working)
  let token
  try {
    token = await makeSessionToken(normalizedEmail)
  } catch (err) {
    console.error('[auth/login] Token signing failed:', err)
    return Response.json({ error: 'Failed to create session. Please try again.' }, { status: 500 })
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

  console.log('[auth/login] Session created for:', normalizedEmail)
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
  })
}
