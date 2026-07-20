import { getSupabase } from '../../../../lib/auth'

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { email } = body
  const normalizedEmail = email?.toLowerCase().trim()

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://measureapp.pro'

  try {
    const supabase = getSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${appUrl}/reset-password`,
    })

    if (error) {
      // Don't leak whether the email exists or not — just log it server-side.
      console.error('[auth/forgot-password] Supabase error:', error.message)
    } else {
      console.log('[auth/forgot-password] Reset email requested for:', normalizedEmail)
    }
  } catch (err) {
    console.error('[auth/forgot-password] Unexpected error:', err)
  }

  // Always return a generic success response regardless of outcome.
  return Response.json({ ok: true })
}
