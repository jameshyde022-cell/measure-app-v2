import { createClient } from '@supabase/supabase-js'

function getAnonClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    // Force live reads: supabase-js goes through the global fetch, which
    // Next.js/Vercel caches by default. Bypass the Data Cache.
    global: { fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }) },
  })
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    // Force live reads: supabase-js goes through the global fetch, which
    // Next.js/Vercel caches by default. Bypass the Data Cache.
    global: { fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }) },
  })
}

const INVALID_LINK_ERROR = 'Reset link is invalid or has expired. Please request a new one.'

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { token, type, newPassword } = body

  if (!token || (type !== 'hash' && type !== 'code')) {
    return Response.json({ error: INVALID_LINK_ERROR }, { status: 400 })
  }
  if (!newPassword || newPassword.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const anonSupabase = getAnonClient()
  let userId = null

  try {
    if (type === 'hash') {
      const { data, error } = await anonSupabase.auth.getUser(token)
      if (error || !data?.user) {
        console.error('[auth/reset-password] getUser failed:', error?.message)
        return Response.json({ error: INVALID_LINK_ERROR }, { status: 401 })
      }
      userId = data.user.id
    } else {
      const { data, error } = await anonSupabase.auth.exchangeCodeForSession(token)
      if (error || !data?.user) {
        console.error('[auth/reset-password] exchangeCodeForSession failed:', error?.message)
        return Response.json({ error: INVALID_LINK_ERROR }, { status: 401 })
      }
      userId = data.user.id
    }
  } catch (err) {
    console.error('[auth/reset-password] Unexpected verification error:', err)
    return Response.json({ error: INVALID_LINK_ERROR }, { status: 401 })
  }

  if (!userId) {
    return Response.json({ error: INVALID_LINK_ERROR }, { status: 401 })
  }

  try {
    const adminSupabase = getAdminClient()
    const { error } = await adminSupabase.auth.admin.updateUserById(userId, { password: newPassword })
    if (error) {
      console.error('[auth/reset-password] updateUserById failed:', error.message)
      return Response.json({ error: 'Failed to reset password. Please try again.' }, { status: 400 })
    }
  } catch (err) {
    console.error('[auth/reset-password] Unexpected update error:', err)
    return Response.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 })
  }

  console.log('[auth/reset-password] Password reset for user:', userId)
  return Response.json({ ok: true })
}
