import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request) {
  const { origin } = new URL(request.url)

  // Generic UA gets woff format from Google Fonts, which Satori handles reliably
  let fontData = null
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    ).then(r => r.text())
    const fontUrl = css.match(/url\(([^)]+)\)/)?.[1]
    if (fontUrl) fontData = await fetch(fontUrl).then(r => r.arrayBuffer())
  } catch {
    // Falls back to system serif if Google Fonts is unreachable
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#0d0d0d',
          padding: '64px',
          alignItems: 'center',
          gap: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left — wordmark + tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 480,
            flexShrink: 0,
            gap: 20,
          }}
        >
          <div
            style={{
              fontFamily: fontData ? 'Playfair Display' : 'serif',
              fontSize: 92,
              fontWeight: 700,
              color: '#e8b84b',
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            MEASURE
          </div>
          <div
            style={{
              fontSize: 26,
              color: '#888888',
              lineHeight: 1.5,
            }}
          >
            Listing image tool for clothing resellers.
          </div>
        </div>

        {/* Right — before / after cards */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            alignItems: 'flex-start',
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          {/* Before */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <img
              src={`${origin}/before.jpg`}
              width={250}
              height={310}
              style={{ objectFit: 'cover', borderRadius: 10 }}
            />
            <div style={{ color: '#e8b84b', fontSize: 18, fontWeight: 700 }}>
              Before
            </div>
          </div>

          {/* After */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <img
              src={`${origin}/after.png`}
              width={250}
              height={310}
              style={{ objectFit: 'cover', borderRadius: 10 }}
            />
            <div style={{ color: '#e8b84b', fontSize: 18, fontWeight: 700 }}>
              After
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontData
        ? [{ name: 'Playfair Display', data: fontData, weight: 700, style: 'normal' }]
        : [],
    }
  )
}
