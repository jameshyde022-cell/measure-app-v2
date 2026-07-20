import { createClient } from '@supabase/supabase-js'
import { getEmailFromRequest } from '../../../lib/auth'
import { isAdminEmail } from '../../../lib/adminEmails'

export async function GET(request) {
  const email = await getEmailFromRequest(request)
  if (!isAdminEmail(email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
    // Force live reads: supabase-js goes through the global fetch, which
    // Next.js/Vercel caches by default. Bypass the Data Cache.
    { global: { fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }) } }
  )

  const { data, error } = await supabase
    .from('subscribers')
    .select('email, is_pro, created_at, last_login_at')
    .neq('email_marketing_consent', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[marketing-list] Query error:', error.message)
    return Response.json({ error: 'Failed to fetch marketing list.' }, { status: 500 })
  }

  const list = (data || []).map(row => ({
    email: row.email,
    plan: row.is_pro ? 'Pro' : 'Free',
    joined: row.created_at,
    last_active: row.last_login_at,
  }))

  return Response.json({ list })
}
