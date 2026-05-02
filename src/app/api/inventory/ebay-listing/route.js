import Anthropic from '@anthropic-ai/sdk'
import { getEmailFromRequest } from '../../../../lib/auth'

function isRealAnthropicKey(key) {
  return typeof key === 'string' && key.startsWith('sk-ant-') && key.length > 20
}

// Verified eBay leaf category IDs (May 2026)
const CATEGORIES = {
  women: {
    default:   53159, // Women's Tops — fallback
    top:       53159, tops:      53159, blouse: 53159, shirt:   53159,
    dress:     63861, dresses:   63861,
    skirt:     63864, skirts:    63864,
    pants:     63863, trousers:  63863, shorts: 63863,
    jeans:     11554, denim:     11554,
    blazer:    63862, jacket:    63862, coat:   63862, vest:    63862,
    sweater:   63866, knitwear:  63866, jumper: 63866,
    jumpsuit:  3009,  romper:    3009,
    suit:      63865,
  },
  men: {
    default:   57990, // Men's Shirts — fallback
    top:       57990, tops:      57990, shirt:  57990, blouse: 57990,
    tshirt:    15687, tee:       15687,
    pants:     57989, trousers:  57989, shorts: 57989,
    jeans:     11483, denim:     11483,
    blazer:    3001,  suit:      3001,
    jacket:    57988, coat:      57988, vest:   57988,
    sweater:   11484, knitwear:  11484, jumper: 11484,
  },
}

function resolveCategoryId(mannequinType, clothingType) {
  const gender = mannequinType === 'male' ? 'men' : 'women'
  const map = CATEGORIES[gender]
  if (!clothingType) return map.default
  const norm = clothingType.toLowerCase().replace(/[-\s]/g, '')
  for (const [key, id] of Object.entries(map)) {
    if (key === 'default') continue
    if (norm.includes(key)) return id
  }
  return map.default
}

function departmentLabel(mannequinType) {
  if (mannequinType === 'male')   return 'Men'
  if (mannequinType === 'female') return 'Women'
  return 'Unisex'
}

function csvCell(value) {
  if (value === null || value === undefined || value === '') return ''
  const str = String(value)
  if (!/[",\n\r]/.test(str)) return str
  return '"' + str.replace(/"/g, '""') + '"'
}

function buildCsv(listing, imageUrl, mannequinType, clothingType) {
  const specs      = listing.itemSpecifics || {}
  const categoryId = resolveCategoryId(mannequinType, clothingType)
  const department = departmentLabel(mannequinType)
  const descHtml   = (listing.description || '').replace(/\n/g, '<br>')

  const lines = [
    '#INFO,Version=0.0.2,Template= eBay-draft-listings-template_US,,,,,,,,',
    '#INFO Action and Category ID are required fields. 1) Set Action to Draft 2) Please find the category ID for your listings here: https://pages.ebay.com/sellerinformation/news/categorychanges.html,,,,,,,,,,',
    '"#INFO After you\'ve successfully uploaded your draft from the Seller Hub Reports tab, complete your drafts to active listings here: https://www.ebay.com/sh/lst/drafts",,,,,,,,,,',
    '#INFO,,,,,,,,,,',
    'Action(SiteID=US|Country=US|Currency=USD|Version=1193|CC=UTF-8),Custom label (SKU),Category ID,Title,UPC,Price,Quantity,Item photo URL,Condition ID,Description,Format,C:Brand,C:Size,C:Color,C:Department,C:Type,C:Style,C:Sleeve Type,C:Material,C:Neckline,C:Sleeve Length,C:Accents,C:Pattern,C:Theme,C:Features,C:Fit',
    [
      'Draft',
      '',
      categoryId,
      csvCell(listing.title || ''),
      '',
      listing.price || '',
      '1',
      csvCell(imageUrl || ''),
      '3000',
      csvCell(descHtml),
      'FixedPrice',
      csvCell(specs.Brand || ''),
      csvCell(specs.Size || ''),
      csvCell(specs.Color || ''),
      department,
      csvCell(specs.Type || ''),
      csvCell(specs.Style || ''),
      csvCell(specs.SleeveType || ''),
      csvCell(specs.Material || ''),
      csvCell(specs.Neckline || ''),
      csvCell(specs.SleeveLength || ''),
      csvCell(specs.Accents || ''),
      csvCell(specs.Pattern || ''),
      csvCell(specs.Theme || ''),
      csvCell(specs.Features || ''),
      csvCell(specs.Fit || ''),
    ].join(','),
  ]

  return lines.join('\n')
}

export async function POST(request) {
  const email = await getEmailFromRequest(request)
  if (!email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isRealAnthropicKey(process.env.ANTHROPIC_API_KEY)) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured — add a real sk-ant-... key to Vercel env vars' }, { status: 503 })
  }

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { brand, clothingType, condition, taggedSize, flaws, measurements = [], suggestedPrice, imageUrl, mannequinType } = body
  const gender = mannequinType === 'male' ? 'Men' : 'Women'

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
Department: ${gender}
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
  "price": "recommended listing price as a number",
  "condition": "Excellent / Like new OR Very good OR Good OR Fair / Worn — match the input condition exactly",
  "itemSpecifics": {
    "Brand": "${brand || ''}",
    "Size": "${taggedSize || ''}",
    "Color": "infer primary color from garment details",
    "Type": "must be exactly one of: Blouse, Button-Up, Polo, Tank, T-Shirt — pick closest match",
    "Style": "infer style (e.g. Vintage, Casual, Formal, Bohemian, Streetwear)",
    "SleeveType": "infer sleeve construction (e.g. Set-In, Raglan, Dolman, Cap, Puff)",
    "Material": "infer primary fabric (e.g. Cotton, Silk, Polyester, Linen, Wool)",
    "Neckline": "infer neckline (e.g. Crew Neck, V-Neck, Scoop Neck, Turtleneck, Collared, Halter)",
    "SleeveLength": "must be exactly one of: Sleeveless, Short Sleeve, 3/4 Sleeve, Long Sleeve",
    "Accents": "infer any decorative details (e.g. Embroidered, Sequined, Beaded, Lace Trim) or leave blank",
    "Pattern": "must be exactly one of: Animal Print, Argyle/Diamond, Camouflage, Check, Colorblock, Fair Isle, Floral, Geometric, Herringbone, Paisley, Plaid, Polka Dot, Solid, Striped",
    "Theme": "infer theme if applicable (e.g. Floral, Abstract, Graphic, Logo, Nature) or leave blank",
    "Features": "infer notable construction features (e.g. Button Front, Zip Closure, Pockets, Tie Waist) or leave blank",
    "Fit": "infer fit (e.g. Regular, Slim, Oversized, Cropped, Relaxed)"
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

  const csv = buildCsv(listing, imageUrl, mannequinType, clothingType)
  return Response.json({ listing, csv })
}
