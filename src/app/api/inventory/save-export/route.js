import Anthropic from '@anthropic-ai/sdk'
import { getEmailFromRequest, getSupabase } from '../../../../lib/auth'

const CONDITION_TO_EBAY_ID = {
  'Excellent / Like new': 4000,
  'Very good': 5000,
  'Good': 5000,
  'Fair / Worn': 6000,
}

export async function POST(request) {
  const email = await getEmailFromRequest(request)
  if (!email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let formData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const imageFile = formData.get('image')
  const brand = formData.get('brand') || ''
  const clothingType = formData.get('clothingType') || ''
  const condition = formData.get('condition') || ''
  const taggedSize = formData.get('taggedSize') || ''
  const flaws = formData.get('flaws') || ''
  let measurements = []
  try { measurements = JSON.parse(formData.get('measurements') || '[]') } catch {}

  if (!imageFile) return Response.json({ error: 'No image provided' }, { status: 400 })

  const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
  const supabase = getSupabase()

  // Upload image to Supabase Storage
  const safeEmail = email.replace(/[^a-z0-9]/gi, '_')
  const fileName = `${safeEmail}/${Date.now()}.png`
  const { error: uploadError } = await supabase.storage
    .from('exported-images')
    .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    console.error('[save-export] storage upload failed:', uploadError)
    return Response.json({ error: 'Failed to upload image', details: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('exported-images')
    .getPublicUrl(fileName)

  // AI suggested price via Anthropic
  let suggestedPrice = null
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const contentParts = []

      // Include image if under 4MB (Anthropic limit ~5MB)
      if (imageBuffer.length < 4 * 1024 * 1024) {
        contentParts.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: imageBuffer.toString('base64') },
        })
      }

      contentParts.push({
        type: 'text',
        text: `You are a clothing resale pricing expert. Based on the following garment details${imageBuffer.length < 4 * 1024 * 1024 ? ' and image' : ''}, suggest a competitive eBay listing price in USD.

Brand: ${brand || 'Unknown'}
Clothing type: ${clothingType || 'Unknown'}
Condition: ${condition || 'Unknown'}
Tagged size: ${taggedSize || 'Unknown'}
Flaws/damage: ${flaws || 'None noted'}

Consider the brand's typical resale value, item type, condition, and current market demand on eBay and Poshmark.

Respond with ONLY a number representing the price in USD (e.g. 28.00). No currency symbol, no explanation.`,
      })

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16,
        messages: [{ role: 'user', content: contentParts }],
      })

      const priceText = message.content[0]?.text?.trim()
      const parsed = parseFloat(priceText)
      if (!isNaN(parsed) && parsed > 0) suggestedPrice = parsed
    } catch (e) {
      console.error('[save-export] Anthropic price suggestion failed:', e.message)
    }
  }

  // Insert record into exported_images
  const { data: record, error: dbError } = await supabase
    .from('exported_images')
    .insert({
      user_email: email,
      image_url: publicUrl,
      brand: brand || null,
      clothing_type: clothingType || null,
      condition: condition || null,
      tagged_size: taggedSize || null,
      flaws: flaws || null,
      measurements: measurements.length > 0 ? measurements : null,
      suggested_price: suggestedPrice,
    })
    .select('id')
    .single()

  if (dbError) {
    console.error('[save-export] db insert failed:', dbError)
    return Response.json({ error: 'Failed to save record', details: dbError.message }, { status: 500 })
  }

  return Response.json({ imageUrl: publicUrl, suggestedPrice, recordId: record.id })
}
