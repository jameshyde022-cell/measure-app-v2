import Link from 'next/link'

const C = {
  bg: '#0d0d0d',
  gold: '#e8b84b',
  text: '#f0ebe0',
  muted: '#888888',
  border: '#1e1e1e',
}

export default function NotFound() {
  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 14,
          fontWeight: 700,
          color: C.gold,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        404
      </div>
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(28px, 5vw, 40px)',
          fontWeight: 700,
          margin: '0 0 12px',
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          fontSize: 15,
          color: C.muted,
          maxWidth: 420,
          lineHeight: 1.6,
          margin: '0 0 32px',
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            background: C.gold,
            color: '#0d0d0d',
            border: `1px solid ${C.gold}`,
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Back to homepage
        </Link>
        <Link
          href="/app"
          style={{
            display: 'inline-block',
            background: 'transparent',
            color: C.text,
            border: `1px solid ${C.border}`,
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Open the app
        </Link>
      </div>
    </div>
  )
}
