'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const C = {
  bg: '#0d0d0d', surface: '#111111', border: '#1e1e1e',
  gold: '#e8b84b', text: '#f0ebe0', muted: '#555', dim: '#333',
  error: '#EF9A9A', errorBg: '#1a0808', errorBorder: 'rgba(200,64,26,0.3)',
  success: '#81C784', successBg: '#0a1a0a', successBorder: 'rgba(41,182,94,0.3)',
}

const inp = {
  width: '100%', fontFamily: 'monospace', fontSize: 14,
  padding: '11px 13px', border: `1px solid #2a2a2a`, borderRadius: 6,
  background: '#080808', color: C.text, outline: 'none', boxSizing: 'border-box',
}
const lbl = {
  display: 'block', fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: C.muted, marginBottom: 7, fontFamily: 'monospace',
}

function SignupForm() {
  const searchParams = useSearchParams()
  const refParam = searchParams.get('ref') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState(refParam.toUpperCase())
  const [marketingConsent, setMarketingConsent] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, referralCode: referralCode || null, marketingConsent }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Signup failed. Please try again.')
        setLoading(false)
        return
      }

      // Account created and auto-confirmed — go straight to login
      window.location.href = '/login?signup=1'
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={lbl}>Email Address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com" required autoFocus style={inp} />
      </div>

      <div>
        <label style={lbl}>Password <span style={{ color: C.dim }}>(min 8 characters)</span></label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" required minLength={8} style={inp} />
      </div>

      <div>
        <label style={lbl}>Referral Code <span style={{ color: C.dim }}>(optional)</span></label>
        <input type="text" value={referralCode}
          onChange={e => setReferralCode(e.target.value.toUpperCase())}
          placeholder="e.g. MEAS-ABC123" style={{ ...inp, textTransform: 'uppercase' }} />
        {referralCode && (
          <div style={{ fontSize: 10, color: C.success, marginTop: 5, fontFamily: 'monospace' }}>
            ✓ Code entered — you'll receive 2 weeks of Pro free if valid
          </div>
        )}
      </div>

      <label style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
        padding: '10px 12px', border: `1px solid #1e1e1e`, borderRadius: 6, background: '#080808',
      }}>
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={e => setMarketingConsent(e.target.checked)}
          style={{ marginTop: 2, accentColor: C.gold, flexShrink: 0 }}
        />
        <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, fontFamily: 'monospace' }}>
          I agree to receive occasional offers and updates from MEASURE
        </span>
      </label>

      {error && (
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
        {loading ? 'Creating account…' : 'Create Account →'}
      </button>

      <p style={{ fontSize: 11, color: C.dim, textAlign: 'center', lineHeight: 1.7, fontFamily: 'monospace', margin: 0 }}>
        Free plan includes 3 exports. No credit card required.
      </p>
    </form>
  )
}

export default function SignupPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'monospace', color: C.text }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

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
              Create account
            </h1>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: 0 }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: C.gold, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>

          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link href="/" style={{ fontSize: 12, color: '#444', textDecoration: 'none', letterSpacing: '0.04em' }}>
            ← Back to home
          </Link>
        </div>

      </div>
    </div>
  )
}
