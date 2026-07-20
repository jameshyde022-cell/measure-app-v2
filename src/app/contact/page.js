import Link from 'next/link'

export const metadata = {
  title: 'Contact — MEASURE',
  description: 'Get in touch with MEASURE support.',
}

const C = {
  bg: '#0d0d0d',
  gold: '#e8b84b',
  text: '#f0ebe0',
  muted: '#999999',
  dim: '#555555',
  card: '#131313',
  border: '#1e1e1e',
}

const wrap = { maxWidth: 760, margin: '0 auto', padding: '60px 24px 80px' }
const h1 = { fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, color: C.text, margin: '32px 0 8px' }
const p = { fontSize: 14, color: C.muted, lineHeight: 1.75, marginBottom: 14 }

export default function ContactPage() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh' }}>
      <div style={wrap}>
        <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.gold, textDecoration: 'none', letterSpacing: '0.06em' }}>
          MEASURE
        </Link>

        <h1 style={h1}>Contact</h1>
        <p style={p}>
          Have a question, ran into an issue, or want to share feedback? Email us and we'll get back to you.
        </p>

        <a
          href="mailto:jameshyde022@gmail.com?subject=MEASURE%20Support"
          style={{
            display: 'inline-block',
            marginTop: 8,
            marginBottom: 40,
            background: C.gold,
            color: '#0d0d0d',
            padding: '14px 28px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          jameshyde022@gmail.com
        </a>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
            What to include
          </div>
          <p style={p}><strong style={{ color: C.text }}>Billing or subscription issue</strong> — the email on your account and, if possible, the approximate date of the charge in question.</p>
          <p style={p}><strong style={{ color: C.text }}>Image processing problem</strong> — a description of what went wrong and, if you can, the photo you uploaded.</p>
          <p style={p}><strong style={{ color: C.text }}>Account or login issue</strong> — the email address associated with your account.</p>
          <p style={{ ...p, marginBottom: 0 }}><strong style={{ color: C.text }}>General feedback</strong> — anything you'd like to see improved or added.</p>
        </div>
      </div>
    </div>
  )
}
