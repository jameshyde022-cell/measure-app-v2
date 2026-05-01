import { getEmailFromRequest, getSupabase } from '../../../../lib/auth'

export async function GET(request) {
  const email = await getEmailFromRequest(request)
  if (!email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('exported_images')
    .select('*')
    .eq('user_email', email)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[inventory/list] query failed:', error)
    return Response.json({ error: 'Failed to fetch records' }, { status: 500 })
  }

  return Response.json({ records: data || [] })
}
