import Anthropic from '@anthropic-ai/sdk'
import { getEmailFromRequest } from '../../../../lib/auth'

const CONDITION_IDS = {
  'Excellent / Like new': { id: 4000, label: 'Pre-Owned - Like New' },
  'Very good': { id: 5000, label: 'Pre-Owned - Good' },
  'Good': { id: 5000, label: 'Pre-Owned - Good' },
  'Fair / Worn': { id: 6000, label: 'Pre-Owned - Acceptable' },
}

function buildCsv(listing, brand, taggedSize, imageUrl) {
  const conditionEntry = CONDITION_IDS[listing.condition] || { id: 5000, label: listing.condition || 'Pre-Owned - Good' }
  const desc = (listing.description || '').replace(/"/g, '""').replace(/\n/g, ' ')
  const title = (listing.title || '').replace(/"/g, '""')
  const keywords = (listing.keywords || []).join(', ')

  const headers = [
    'Action(SiteID=US|Country=US|Currency=USD|Version=745|CC=UTF-8)',
    '*Title',
    '*Category',
    '*ConditionID',
    'ConditionDescription',
    '*Format',
    'Duration',
    '*StartPrice',
    'BuyItNowPrice',
    '*Quantity',
    'Description',
    'PicURL',
    '*Location',
    '*DispatchTimeMax',
    'Brand',
    'Size',
    'Keywords',
  ].join(',')

  const row = [
    'Add',
    `"${title}"`,
    listing.categoryId || '11554',
    conditionEntry.id,
    `"${conditionEntry.label}"`,
    'FixedPrice',
    'GTC',
    listing.price || '',
    '',
    '1',
    `"${desc}"`,
    imageUrl ? `"${imageUrl}"` : '',
    '"United States"',
    '3',
    `"${(brand || '').replace(/"/g, '""')}"`,
    `"${(taggedSize || '').replace(/"/g, '""')}"`,
    `"${keywords.replace(/"/g, '""')}"`,
  ].join(',')

  return [headers, row].join('\n')
}

export async function POST(request) {
  const email = await getEmailFromRequest(request)
  if (!email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { brand, clothingType, condition, taggedSize, flaws, measurements = [], suggestedPrice, imageUrl } = body

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
        content: `You are an expert eBay listing writer specializing in secondhand clothing. Create a complete, SEO-optimized eBay listing for this item.

Brand: ${brand || 'Unknown'}
Clothing Type: ${clothingType || 'Unknown'}
Condition: ${condition || 'Good'}
Tagged Size: ${taggedSize || 'Unknown'}
Flaws/Damage: ${flaws || 'None noted'}
Suggested Price: ${suggestedPrice ? `$${suggestedPrice}` : 'Unknown'}

Measurements:
${measurementsText}

Return a JSON object with exactly this structure (no markdown, no code fences, pure JSON only):
{
  "title": "eBay listing title under 80 characters, keyword-rich",
  "description": "Full listing description, 3-5 paragraphs covering item details, measurements, condition notes, and shipping info. Plain text, no HTML.",
  "category": "Most specific eBay clothing category name",
  "categoryId": "eBay category ID as a number (e.g. 11554 for Women's Jeans, 57989 for Men's Jeans, 57990 for Men's Shirts, 15724 for Women's Tops, 63861 for Women's Dresses)",
  "price": "recommended listing price as a number",
  "condition": "Excellent / Like new OR Very good OR Good OR Fair / Worn — match the input condition",
  "itemSpecifics": {
    "Brand": "${brand || ''}",
    "Size": "${taggedSize || ''}",
    "Color": "infer from context or leave blank",
    "Material": "infer from context or leave blank",
    "Style": "infer from context or leave blank",
    "Department": "Women or Men",
    "Type": "${clothingType || ''}"
  },
  "keywords": ["array", "of", "10", "targeted", "seo", "search", "keywords", "for", "this", "item"]
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

  const csv = buildCsv(listing, brand, taggedSize, imageUrl)
  return Response.json({ listing, csv })
}
