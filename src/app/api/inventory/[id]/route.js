import { getEmailFromRequest, getSupabase } from '../../../../lib/auth'

export async function PATCH(request, { params }) {
  const email = await getEmailFromRequest(request)
  if (!email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { listing_price, sold_price, sold_date } = body
  const updates = {}
  if (listing_price !== undefined) updates.listing_price = listing_price !== '' && listing_price !== null ? Number(listing_price) : null
  if (sold_price !== undefined) updates.sold_price = sold_price !== '' && sold_price !== null ? Number(sold_price) : null
  if (sold_date !== undefined) updates.sold_date = sold_date || null

  let supabase
  try {
    supabase = getSupabase()
  } catch (e) {
    return Response.json({ error: 'Database configuration error', details: e.message }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('exported_images')
    .update(updates)
    .eq('id', params.id)
    .eq('user_email', email)
    .select()
    .single()

  if (error) {
    console.error('[inventory/[id]] update failed:', error)
    return Response.json({ error: 'Failed to update record' }, { status: 500 })
  }

  return Response.json({ record: data })
}
