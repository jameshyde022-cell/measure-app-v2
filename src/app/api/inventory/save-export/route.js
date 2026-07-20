import Anthropic from '@anthropic-ai/sdk'
import { getEmailFromRequest, getSupabase } from '../../../../lib/auth'

function isRealAnthropicKey(key) {
  return typeof key === 'string' && key.startsWith('sk-ant-') && key.length > 20
}

export async function POST(request) {
  console.log('[save-export] POST received')

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  let email
  try {
    email = await getEmailFromRequest(request)
  } catch (e) {
    console.error('[save-export] session extraction threw:', e.message)
    return Response.json({ error: 'Session error' }, { status: 500 })
  }

  if (!email) {
    console.error('[save-export] no valid session cookie — returning 401')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  console.log('[save-export] authenticated as:', email)

  // ── 1b. Supabase client ───────────────────────────────────────────────────
  let supabase
  try {
    supabase = getSupabase()
  } catch (e) {
    console.error('[save-export] getSupabase failed:', e.message)
    return Response.json({ error: 'Database configuration error', details: e.message }, { status: 500 })
  }

  // ── 1c. Server-side free-tier daily export limit ──────────────────────────
  // Source of truth for the "3 free exports/day" rule. Checked BEFORE any
  // storage upload or DB insert so rejected exports do no wasted work and never
  // count against the user. Pro (and unexpired Pro-trial) users are exempt.
  try {
    const { data: sub } = await supabase
      .from('subscribers')
      .select('is_pro, pro_trial_expires_at')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    let isPro = sub?.is_pro === true
    if (isPro && sub?.pro_trial_expires_at && new Date(sub.pro_trial_expires_at) < new Date()) {
      isPro = false
    }

    if (!isPro) {
      const now = new Date()
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const startOfTomorrow = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

      const { count, error: countError } = await supabase
        .from('exported_images')
        .select('id', { count: 'exact', head: true })
        .eq('user_email', email)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', startOfTomorrow.toISOString())

      if (countError) {
        console.error('[save-export] export count query failed:', countError.message)
        return Response.json({ error: 'Failed to verify export limit' }, { status: 500 })
      }

      if ((count ?? 0) >= 3) {
        console.log('[save-export] daily free export limit reached for:', email)
        return Response.json(
          { error: 'Daily free export limit reached. Upgrade to Pro for unlimited exports.' },
          { status: 403 }
        )
      }
    }
  } catch (e) {
    console.error('[save-export] limit check threw:', e.message)
    return Response.json({ error: 'Failed to verify export limit' }, { status: 500 })
  }

  // ── 2. Parse form data ────────────────────────────────────────────────────
  let formData
  try {
    formData = await request.formData()
  } catch (e) {
    console.error('[save-export] formData parse failed:', e.message)
    return Response.json({ error: 'Invalid request body', details: e.message }, { status: 400 })
  }

  const imageFile = formData.get('image')
  if (!imageFile) {
    console.error('[save-export] no image field in formData')
    return Response.json({ error: 'No image provided' }, { status: 400 })
  }

  const brand        = formData.get('brand')        || ''
  const clothingType = formData.get('clothingType') || ''
  const condition    = formData.get('condition')    || ''
  const taggedSize   = formData.get('taggedSize')   || ''
  const flaws        = formData.get('flaws')        || ''
  const weightOz      = formData.get('weightOz')      || ''
  const mannequinType = formData.get('mannequin_type') || ''
  let measurements    = []
  try { measurements = JSON.parse(formData.get('measurements') || '[]') } catch {}

  console.log('[save-export] metadata — brand:', brand, '| type:', clothingType, '| condition:', condition)

  let imageBuffer
  try {
    imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    console.log('[save-export] image buffer size:', imageBuffer.length, 'bytes')
  } catch (e) {
    console.error('[save-export] failed to read image buffer:', e.message)
    return Response.json({ error: 'Failed to read image', details: e.message }, { status: 400 })
  }

  // ── 4. Upload to Supabase Storage ─────────────────────────────────────────
  const safeEmail = email.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const fileName  = `${safeEmail}/${Date.now()}.png`
  console.log('[save-export] uploading to storage path:', fileName)

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('exported-images')
    .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    console.error('[save-export] storage upload failed — code:', uploadError.statusCode, '| message:', uploadError.message, '| error:', JSON.stringify(uploadError))
    return Response.json({
      error: 'Failed to upload image to storage',
      details: uploadError.message,
      hint: 'Make sure the "exported-images" bucket exists in Supabase Storage and is set to public.',
    }, { status: 500 })
  }

  console.log('[save-export] storage upload succeeded, path:', uploadData?.path)

  const { data: { publicUrl } } = supabase.storage
    .from('exported-images')
    .getPublicUrl(fileName)

  console.log('[save-export] public URL:', publicUrl)

  // ── 5. Insert DB record (without suggested_price first) ───────────────────
  console.log('[save-export] inserting into exported_images...')

  const { data: record, error: dbError } = await supabase
    .from('exported_images')
    .insert({
      user_email:    email,
      image_url:     publicUrl,
      brand:         brand        || null,
      clothing_type: clothingType || null,
      condition:     condition    || null,
      tagged_size:   taggedSize   || null,
      flaws:         flaws        || null,
      weight_oz:      weightOz    ? parseFloat(weightOz) : null,
      mannequin_type: mannequinType || null,
      measurements:  measurements.length > 0 ? measurements : null,
      suggested_price: null,
    })
    .select('id')
    .single()

  if (dbError) {
    console.error('[save-export] DB insert failed — code:', dbError.code, '| message:', dbError.message, '| details:', dbError.details, '| hint:', dbError.hint)
    return Response.json({
      error: 'Failed to save record to database',
      details: dbError.message,
      hint: dbError.hint || 'Make sure the exported_images table exists. Run supabase/migrations/001_exported_images.sql in the Supabase SQL editor.',
    }, { status: 500 })
  }

  const recordId = record.id
  console.log('[save-export] DB insert succeeded, record id:', recordId)

  // ── 6. AI suggested price (text-only, after save — timeout safe) ──────────
  let suggestedPrice = null
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (isRealAnthropicKey(apiKey)) {
    console.log('[save-export] calling Anthropic for price suggestion...')
    try {
      const anthropic = new Anthropic({ apiKey })
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16,
        messages: [{
          role: 'user',
          content: `You are a clothing resale pricing expert. Suggest a competitive eBay listing price in USD.

Brand: ${brand || 'Unknown'}
Clothing type: ${clothingType || 'Unknown'}
Condition: ${condition || 'Unknown'}
Tagged size: ${taggedSize || 'Unknown'}
Flaws/damage: ${flaws || 'None noted'}

Respond with ONLY a number (e.g. 28.00). No currency symbol, no explanation.`,
        }],
      })

      const priceText = message.content[0]?.text?.trim()
      const parsed    = parseFloat(priceText)
      if (!isNaN(parsed) && parsed > 0) suggestedPrice = parsed
      console.log('[save-export] Anthropic price suggestion:', suggestedPrice)
    } catch (e) {
      console.error('[save-export] Anthropic price call failed:', e.message)
    }
  } else {
    console.log('[save-export] skipping Anthropic — ANTHROPIC_API_KEY not set or is a placeholder')
  }

  // ── 7. Update record with suggested price ─────────────────────────────────
  if (suggestedPrice !== null) {
    const { error: updateError } = await supabase
      .from('exported_images')
      .update({ suggested_price: suggestedPrice })
      .eq('id', recordId)

    if (updateError) {
      console.error('[save-export] price update failed:', updateError.message)
    } else {
      console.log('[save-export] price updated on record')
    }
  }

  console.log('[save-export] complete — returning success')
  return Response.json({ imageUrl: publicUrl, suggestedPrice, recordId })
}
