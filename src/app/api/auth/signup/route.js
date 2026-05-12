import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { email, password, referralCode, marketingConsent } = body
  const normalizedEmail = email?.toLowerCase().trim()

  if (!normalizedEmail || !normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
  }
  if (!password || password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://measure-app-hazel.vercel.app'

  const { error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: `${appUrl}/login?verified=1`,
      data: {
        referral_code: referralCode ? referralCode.trim().toUpperCase() : null,
        marketing_consent: marketingConsent !== false,
      },
    },
  })

  if (error) {
    console.error('[auth/signup] Supabase error:', error.message)
    if (error.message.toLowerCase().includes('already registered')) {
      return Response.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 })
    }
    return Response.json({ error: error.message }, { status: 400 })
  }

  console.log('[auth/signup] Verification email sent to:', normalizedEmail)
  return Response.json({ ok: true })
}
