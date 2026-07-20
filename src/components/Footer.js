import Link from 'next/link'

const C = {
  border: '#1e1e1e',
  gold: '#e8b84b',
  text: '#f0ebe0',
  muted: '#888888',
  dim: '#444444',
}

export default function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: '40px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 40 }}>
          <div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              fontWeight: 700,
              color: C.gold,
              marginBottom: 8,
            }}>
              MEASURE
            </div>
            <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.65, maxWidth: 220 }}>
              Listing image tool for clothing resellers.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.dim,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}>
                Product
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link href="/#features" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>Features</Link>
                <Link href="/#pricing" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>Pricing</Link>
                <Link href="/app" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>App</Link>
              </div>
            </div>
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.dim,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}>
                Legal
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link href="/terms" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>Terms of Service</Link>
                <Link href="/privacy" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>Privacy Policy</Link>
                <Link href="/refund-policy" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>Refund Policy</Link>
                <Link href="/contact" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>Contact</Link>
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 40, fontSize: 12, color: C.dim }}>
          © {new Date().getFullYear()} MEASURE. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
