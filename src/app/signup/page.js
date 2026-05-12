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
  padding: '11px 13px', border: `1px solid #2a2a2a`, borderRadius: 6,
  background: '#080808', color: C.text, outline: 'none', boxSizing: 'border-box',
}
const lbl = {
  display: 'block', fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: C.muted, marginBottom: 7, fontFamily: 'monospace',
}

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
  </svg>
)

function SignupForm() {
  const searchParams = useSearchParams()
  const refParam = searchParams.get('ref') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState(refParam.toUpperCase())
  const [marketingConsent, setMarketingConsent] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#1e1e1e' }} />
        <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace', letterSpacing: '0.1em' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: '#1e1e1e' }} />
      </div>

      <a href="/api/auth/google" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', padding: '12px', background: '#111', border: '1px solid #2a2a2a',
        borderRadius: 6, fontFamily: 'monospace', fontSize: 13, color: C.text,
        textDecoration: 'none', boxSizing: 'border-box',
      }}>
        <GoogleIcon />
        Continue with Google
      </a>
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
