import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { getEmailFromRequest, getSupabase } from '../../../../lib/auth'

function isRealAnthropicKey(key) {
  return typeof key === 'string' && key.startsWith('sk-ant-') && key.length > 20
}

// Attempt a full insert; if a column doesn't exist yet (migration not run),
// fall back to the base columns from migration 001 so the save never hard-fails
// due to a missing optional column.
async function insertExportRecord(supabase, full) {
  console.log('[save-export] DB insert — fields:', Object.keys(full).join(', '))
  const { data, error } = await supabase
    .from('exported_images')
    .insert(full)
    .select('id')
    .single()

  if (!error) return { data, error: null }

  // 42703 = column does not exist — migrations 003/004 not yet run
  if (error.code === '42703') {
    console.warn('[save-export] DB insert: column not found (', error.message, ') — retrying with base columns only')
    const { weight_oz, mannequin_type, ...base } = full
    const fallback = await supabase
      .from('exported_images')
      .insert(base)
      .select('id')
      .single()
    return fallback
  }

  return { data: null, error }
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

  const brand         = formData.get('brand')         || ''
  const clothingType  = formData.get('clothingType')  || ''
  const condition     = formData.get('condition')     || ''
  const taggedSize    = formData.get('taggedSize')     || ''
  const flaws         = formData.get('flaws')         || ''
  const weightOz      = formData.get('weightOz')      || ''
  const mannequinType = formData.get('mannequin_type') || ''
  let measurements = []
  try { measurements = JSON.parse(formData.get('measurements') || '[]') } catch {}

  console.log('[save-export] metadata — brand:', brand, '| type:', clothingType, '| condition:', condition, '| mannequin:', mannequinType, '| weightOz:', weightOz)

  // ── 3. Read image buffer ──────────────────────────────────────────────────
  let imageBuffer
  try {
    imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    console.log('[save-export] image — raw size:', imageBuffer.length, 'bytes | fileType:', imageFile.type)
  } catch (e) {
    console.error('[save-export] failed to read image buffer:', e.message)
    return Response.json({ error: 'Failed to read image', details: e.message }, { status: 400 })
  }

  if (imageBuffer.length === 0) {
    console.error('[save-export] image buffer is empty — aborting')
    return Response.json({ error: 'Image buffer is empty' }, { status: 400 })
  }

  // ── 4. Compress — resize to max 1200px, JPEG 80% ─────────────────────────
  let uploadBuffer
  try {
    uploadBuffer = await sharp(imageBuffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    console.log('[save-export] compression — before:', imageBuffer.length, 'bytes → after:', uploadBuffer.length, 'bytes')
  } catch (e) {
    console.error('[save-export] sharp compression failed:', e.message, '— falling back to original')
    uploadBuffer = imageBuffer
  }

  // ── 5. Supabase client ────────────────────────────────────────────────────
  let supabase
  try {
    supabase = getSupabase()
  } catch (e) {
    console.error('[save-export] getSupabase failed:', e.message)
    return Response.json({ error: 'Database configuration error', details: e.message }, { status: 500 })
  }

  const activeKeyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'
  console.log('[save-export] Supabase key type:', activeKeyType)
  if (activeKeyType === 'anon') {
    console.warn('[save-export] WARNING: using anon key — storage uploads may be blocked by RLS')
  }

  // ── 6. Verify bucket ──────────────────────────────────────────────────────
  const { data: bucketInfo, error: bucketError } = await supabase.storage.getBucket('exported-images')
  if (bucketError) {
    console.error('[save-export] bucket check failed:', bucketError.statusCode, bucketError.message)
  } else {
    console.log('[save-export] bucket "exported-images" confirmed — public:', bucketInfo?.public)
  }

  // ── 7. Upload to Supabase Storage ─────────────────────────────────────────
  const safeEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  const fileName  = `${safeEmail}/${Date.now()}.jpg`
  console.log('[save-export] uploading — path:', fileName, '| bytes:', uploadBuffer.length, '| contentType: image/jpeg')

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('exported-images')
    .upload(fileName, new Uint8Array(uploadBuffer), { contentType: 'image/jpeg', upsert: true })

  if (uploadError) {
    console.error('[save-export] storage upload FAILED:', JSON.stringify({
      message: uploadError.message, statusCode: uploadError.statusCode,
      name: uploadError.name, cause: uploadError.cause, error: uploadError.error,
    }))
    return Response.json({
      error:   'Failed to upload image to storage',
      details: uploadError.message,
      code:    uploadError.statusCode,
      hint:    activeKeyType === 'anon'
        ? 'Set SUPABASE_SERVICE_ROLE_KEY in Vercel env vars to bypass storage RLS.'
        : 'Run supabase/migrations/002_fix_rls.sql in the Supabase SQL Editor.',
    }, { status: 500 })
  }

  console.log('[save-export] storage upload succeeded — path:', uploadData?.path)

  const { data: { publicUrl } } = supabase.storage.from('exported-images').getPublicUrl(fileName)
  console.log('[save-export] public URL:', publicUrl)

  // ── 8. Insert DB record ───────────────────────────────────────────────────
  console.log('[save-export] inserting DB record...')

  const { data: record, error: dbError } = await insertExportRecord(supabase, {
    user_email:      email,
    image_url:       publicUrl,
    brand:           brand        || null,
    clothing_type:   clothingType || null,
    condition:       condition    || null,
    tagged_size:     taggedSize   || null,
    flaws:           flaws        || null,
    weight_oz:       weightOz     ? parseFloat(weightOz) : null,
    mannequin_type:  mannequinType || null,
    measurements:    measurements.length > 0 ? measurements : null,
    suggested_price: null,
  })

  if (dbError) {
    console.error('[save-export] DB insert FAILED — code:', dbError.code, '| message:', dbError.message, '| details:', dbError.details, '| hint:', dbError.hint)
    return Response.json({
      error:   'Failed to save record to database',
      code:    dbError.code,
      details: dbError.message,
      hint:    dbError.code === '42703'
        ? `Column missing: ${dbError.message}. Run supabase/migrations/003_add_weight.sql and 004_add_mannequin_type.sql in the Supabase SQL Editor.`
        : dbError.hint || 'Run supabase/migrations/001_exported_images.sql in the Supabase SQL Editor.',
    }, { status: 500 })
  }

  const recordId = record.id
  console.log('[save-export] DB insert succeeded — record id:', recordId)

  // ── 9. AI suggested price ─────────────────────────────────────────────────
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
    console.log('[save-export] skipping Anthropic — ANTHROPIC_API_KEY not set or placeholder')
  }

  // ── 10. Update record with suggested price ────────────────────────────────
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
