'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/app'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Sign in failed. Please try again.')
        setLoading(false)
        return
      }

      // Full navigation instead of router.push so that if middleware redirects
      // back to /login the page reloads fresh and loading never stays stuck.
      window.location.href = next
    } catch (err) {
      console.error('[login] Fetch error:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const inp = {
    width: '100%',
    fontFamily: 'monospace',
    fontSize: 14,
    padding: '11px 13px',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    background: '#080808',
    color: '#f0ebe0',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{
          display: 'block',
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#555',
          marginBottom: 7,
          fontFamily: 'monospace',
        }}>
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
          style={inp}
        />
      </div>

      {error && (
        <div style={{
          fontSize: 12,
          color: '#EF9A9A',
          padding: '9px 12px',
          background: '#1a0808',
          border: '1px solid rgba(200,64,26,0.3)',
          borderRadius: 6,
          fontFamily: 'monospace',
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        style={{
          padding: '13px',
          background: loading || !email ? '#1a1a1a' : '#e8b84b',
          border: '1px solid transparent',
          borderRadius: 6,
          fontFamily: "'Playfair Display', serif",
          fontSize: 15,
          fontWeight: 700,
          color: loading || !email ? '#444' : '#0d0d0d',
          cursor: loading || !email ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        {loading ? 'Signing in…' : 'Continue to MEASURE'}
      </button>

      <p style={{
        fontSize: 11,
        color: '#333',
        textAlign: 'center',
        lineHeight: 1.7,
        fontFamily: 'monospace',
        margin: 0,
      }}>
        No password needed. Free accounts include 3 exports.<br />
        No credit card required.
      </p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={{
      background: '#0d0d0d',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'monospace',
      color: '#f0ebe0',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 28,
              fontWeight: 700,
              color: '#e8b84b',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}>
              MEASURE
            </div>
          </Link>
          <div style={{ fontSize: 11, color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Listing image tool for clothing resellers
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#111111',
          border: '1px solid #1e1e1e',
          borderRadius: 14,
          padding: 32,
        }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              fontWeight: 700,
              color: '#f0ebe0',
              marginBottom: 8,
              margin: 0,
            }}>
              Sign in
            </h1>
            <p style={{
              fontSize: 13,
              color: '#555',
              lineHeight: 1.65,
              marginTop: 8,
              marginBottom: 0,
            }}>
              Enter your email to access MEASURE. New here? Your account is created automatically.
            </p>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link href="/" style={{
            fontSize: 12,
            color: '#444',
            textDecoration: 'none',
            letterSpacing: '0.04em',
          }}>
            ← Back to home
          </Link>
          <span style={{ color: '#2a2a2a', margin: '0 12px' }}>·</span>
          <Link href="/pricing" style={{
            fontSize: 12,
            color: '#444',
            textDecoration: 'none',
            letterSpacing: '0.04em',
          }}>
            Pricing
          </Link>
        </div>

      </div>
    </div>
  )
}
