import Anthropic from '@anthropic-ai/sdk'
import { getEmailFromRequest } from '../../../../lib/auth'

function isRealAnthropicKey(key) {
  return typeof key === 'string' && key.startsWith('sk-ant-') && key.length > 20
}

// eBay condition IDs updated Feb 2025 — three tiers for pre-owned apparel
const CONDITION_IDS = {
  'Excellent / Like new': { id: 2990, label: 'Pre-Owned - Excellent' },
  'Very good':            { id: 3000, label: 'Pre-Owned - Good' },
  'Good':                 { id: 3000, label: 'Pre-Owned - Good' },
  'Fair / Worn':          { id: 6000, label: 'Pre-Owned - Fair' },
}

function csvCell(value) {
  if (value === null || value === undefined || value === '') return ''
  const str = String(value)
  if (!/[",\n\r]/.test(str)) return str
  return '"' + str.replace(/"/g, '""') + '"'
}

function shippingProfile(weightOz) {
  console.log('[ebay-listing] shippingProfile input:', weightOz, typeof weightOz)
  // Always provide a valid fallback — empty ShippingProfileName fails validation
  if (weightOz === null || weightOz === undefined || weightOz === '' || isNaN(Number(weightOz))) {
    console.log('[ebay-listing] shippingProfile: no valid weight, using default')
    return 'Calculated: USPSParcel , 2 business days'
  }
  const profile = Number(weightOz) <= 16
    ? 'Calculated: USPSParcel , 2 business days'
    : 'padded env'
  console.log('[ebay-listing] shippingProfile selected:', profile)
  return profile
}

function buildCsv(listing, brand, taggedSize, imageUrl, weightOz) {
  const conditionEntry = CONDITION_IDS[listing.condition] || { id: 3000, label: 'Pre-Owned - Good' }
  const specs = listing.itemSpecifics || {}

  // Description is an HTML field — newlines become <br>
  const descHtml = (listing.description || '').replace(/\n/g, '<br>')

  // PostalCode: digits only, no hidden characters
  const postalCode = '96822'.replace(/\D/g, '')

  const headers = [
    'Action(SiteID=US|Country=US|Currency=USD|Version=1193|CC=UTF-8)',
    'Category',
    'StoreCategory',
    'Title',
    'Subtitle',
    'ConditionID',
    'ConditionDescription',
    'C:Brand',
    'C:Size',
    'C:Color',
    'C:Style',
    'C:Material',
    'C:Era',
    'C:Pattern',
    'C:Occasion',
    'C:Country of Manufacture',
    'Description',
    'Format',
    'Duration',
    'StartPrice',
    'BuyItNowPrice',
    'Quantity',
    'PicURL',
    'ShippingProfileName',
    'DispatchTimeMax',
    'ReturnsAcceptedOption',
    'Location',
    'PostalCode',
  ].join(',')

  const row = [
    'Add',
    csvCell(listing.categoryId || '53159'),
    '',
    csvCell(listing.title || ''),
    '',
    conditionEntry.id,
    csvCell(conditionEntry.label),
    csvCell(brand || ''),
    csvCell(taggedSize || ''),
    csvCell(specs.Color || ''),
    csvCell(specs.Style || ''),
    csvCell(specs.Material || ''),
    '',
    '',
    '',
    '',
    csvCell(descHtml),
    'FixedPrice',
    'GTC',
    listing.price || '',
    '',
    '1',
    csvCell(imageUrl || ''),
    csvCell(shippingProfile(weightOz)),
    '3',
    'ReturnsNotAccepted',
    'Honolulu, HI',
    postalCode,
  ].join(',')

  return [headers, row].join('\n')
}

export async function POST(request) {
  const email = await getEmailFromRequest(request)
  if (!email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isRealAnthropicKey(process.env.ANTHROPIC_API_KEY)) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured — add a real sk-ant-... key to Vercel env vars' }, { status: 503 })
  }

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { brand, clothingType, condition, taggedSize, flaws, measurements = [], suggestedPrice, imageUrl, weightOz } = body

  console.log('[ebay-listing] received weightOz:', weightOz, '| type:', typeof weightOz)

  const measurementsText = measurements.length > 0
    ? measurements.map((m, i) => `${i + 1}. ${m.name}${m.value ? `: ${m.value}${m.unit}` : ''}`).join('\n')
    : 'Not provided'

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let listing = null
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are a vintage fashion specialist and archival consignment expert writing eBay listings. Your tone is editorial, informed, and confident — like a Vestiaire Collective or What Goes Around Comes Around specialist, not an eBay listing bot.

Brand: ${brand || 'Unknown'}
Clothing Type: ${clothingType || 'Unknown'}
Condition: ${condition || 'Good'}
Tagged Size: ${taggedSize || 'Unknown'}
Flaws/Damage: ${flaws || 'None noted'}
Suggested Price: ${suggestedPrice ? `$${suggestedPrice}` : 'Unknown'}

Measurements:
${measurementsText}

Write the description as HTML using this exact structure:

Opening paragraph: Establish the piece's place in the brand's history. Reference the specific era, the cultural moment, the designer's obsession or theme at the time. Be specific — not "this is a great piece" but "this is a definitive example of [Brand]'s [era] obsession with [specific theme]." Use <p> tags.

Design Details section: A <p><b>Design Details</b></p> heading followed by bullet points using <ul><li> tags. Each bullet has a <b>Label:</b> followed by precise collector-level description of one design element — the print, hardware, fabric, construction, trim, or finishing detail.

Closing: One or two sentences in a <p> tag on wearability, styling context, or why this piece matters to a collector.

Never use: "great condition", "must have", "perfect for any wardrobe", "vintage vibes", or any filler phrase. Every sentence must contain specific, accurate information about the piece.

Return a JSON object with exactly this structure (no markdown, no code fences, pure JSON only):
{
  "title": "eBay listing title under 80 characters — keyword-rich, specific, no puffery",
  "description": "Full HTML description structured as described above",
  "category": "Most specific eBay clothing category name",
  "categoryId": "eBay leaf category ID — use 53159 for Women's Tops, 11554 for Women's Jeans, 57989 for Men's Jeans, 57990 for Men's Shirts, 63861 for Women's Dresses, 11484 for Women's Coats & Jackets. Must be a leaf category.",
  "price": "recommended listing price as a number",
  "condition": "Excellent / Like new OR Very good OR Good OR Fair / Worn — match the input condition exactly",
  "itemSpecifics": {
    "Brand": "${brand || ''}",
    "Size": "${taggedSize || ''}",
    "Color": "infer from context or leave blank",
    "Material": "infer from context or leave blank",
    "Style": "infer from context or leave blank",
    "Department": "Women or Men",
    "Type": "${clothingType || ''}"
  },
  "keywords": ["array", "of", "10", "targeted", "collector-level", "search", "keywords", "for", "this", "specific", "item"]
}`,
      }],
    })

    const text = message.content[0]?.text?.trim() || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) listing = JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('[ebay-listing] Anthropic call failed:', e.message)
    return Response.json({ error: 'Failed to generate listing', details: e.message }, { status: 500 })
  }

  console.log('[ebay-listing] categoryId from AI:', listing?.categoryId)
  const csv = buildCsv(listing, brand, taggedSize, imageUrl, weightOz)
  return Response.json({ listing, csv })
}
