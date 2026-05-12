'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const C = {
  bg: '#0d0d0d', surface: '#111111', border: '#1e1e1e',
  gold: '#e8b84b', text: '#f0ebe0', muted: '#555', dim: '#333',
  error: '#EF9A9A', errorBg: '#1a0808', errorBorder: 'rgba(200,64,26,0.3)',
  success: '#81C784', successBg: '#0a1a0a', successBorder: 'rgba(41,182,94,0.3)',
}

const inp = {
  width: '100%', fontFamily: 'monospace', fontSize: 14,
  padding: '11px 13px', border: '1px solid #2a2a2a', borderRadius: 6,
  background: '#080808', color: C.text, outline: 'none', boxSizing: 'border-box',
}
const lbl = {
  display: 'block', fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: C.muted, marginBottom: 7, fontFamily: 'monospace',
}

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/app'
  const verified = searchParams.get('verified') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [unverified, setUnverified] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password || loading) return
    setLoading(true)
    setError(null)
    setUnverified(false)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (data.unverified) setUnverified(true)
        setError(data.error || 'Sign in failed. Please try again.')
        setLoading(false)
        return
      }

      window.location.href = next
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      {verified && (
        <div style={{ fontSize: 12, color: C.success, padding: '10px 12px', background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 6, fontFamily: 'monospace', marginBottom: 16 }}>
          ✓ Email verified! Sign in below to access your account.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={lbl}>Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" required autoFocus style={inp} />
        </div>

        <div>
          <label style={lbl}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required style={inp} />
        </div>

        {unverified && (
          <div style={{ fontSize: 12, color: '#f0c040', padding: '9px 12px', background: '#1a1500', border: '1px solid rgba(240,192,64,0.3)', borderRadius: 6, fontFamily: 'monospace' }}>
            Please check your email to verify your account before continuing.
          </div>
        )}

        {error && !unverified && (
          <div style={{ fontSize: 12, color: C.error, padding: '9px 12px', background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 6, fontFamily: 'monospace' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || !email || !password} style={{
          padding: '13px', background: loading || !email || !password ? '#1a1a1a' : C.gold,
          border: '1px solid transparent', borderRadius: 6,
          fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700,
          color: loading || !email || !password ? '#444' : '#0d0d0d',
          cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}>
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>

        <p style={{ fontSize: 11, color: C.dim, textAlign: 'center', lineHeight: 1.7, fontFamily: 'monospace', margin: 0 }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: C.gold, textDecoration: 'none' }}>Create one free</Link>
        </p>
      </form>
    </>
  )
}

export default function LoginPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'monospace', color: C.text }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: C.gold, letterSpacing: '0.06em', marginBottom: 8 }}>
              MEASURE
            </div>
          </Link>
          <div style={{ fontSize: 11, color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Listing image tool for clothing resellers
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 32 }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>
              Sign in
            </h1>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: 0 }}>
              Access your MEASURE account.
            </p>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link href="/" style={{ fontSize: 12, color: '#444', textDecoration: 'none', letterSpacing: '0.04em' }}>
            ← Back to home
          </Link>
          <span style={{ color: '#2a2a2a', margin: '0 12px' }}>·</span>
          <Link href="/pricing" style={{ fontSize: 12, color: '#444', textDecoration: 'none', letterSpacing: '0.04em' }}>
            Pricing
          </Link>
        </div>

      </div>
    </div>
  )
}
