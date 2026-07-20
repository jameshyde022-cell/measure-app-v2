'use client'

import { useState, useEffect, Suspense } from 'react'
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

function ResetPasswordForm() {
  const searchParams = useSearchParams()

  const [checking, setChecking] = useState(true)
  const [token, setToken] = useState(null)
  const [tokenType, setTokenType] = useState(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const hashParams = new URLSearchParams(hash.slice(1))
      const accessToken = hashParams.get('access_token')
      if (accessToken) {
        setToken(accessToken)
        setTokenType('hash')
        setChecking(false)
        return
      }
    }

    const code = searchParams.get('code')
    if (code) {
      setToken(code)
      setTokenType('code')
      setChecking(false)
      return
    }

    setChecking(false)
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type: tokenType, newPassword }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Failed to reset password. Please try again.')
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (checking) return null

  if (!token) {
    return (
      <div>
        <div style={{ fontSize: 12, color: C.error, padding: '9px 12px', background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 6, fontFamily: 'monospace', marginBottom: 16 }}>
          Invalid or expired reset link.
        </div>
        <p style={{ fontSize: 11, color: C.dim, textAlign: 'center', lineHeight: 1.7, fontFamily: 'monospace', margin: 0 }}>
          <Link href="/forgot-password" style={{ color: C.gold, textDecoration: 'none' }}>Request a new link</Link>
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div>
        <div style={{ fontSize: 12, color: C.success, padding: '10px 12px', background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 6, fontFamily: 'monospace', marginBottom: 16 }}>
          ✓ Password updated. You can now sign in with your new password.
        </div>
        <Link href="/login" style={{
          display: 'block', textAlign: 'center', padding: '13px', background: C.gold,
          border: '1px solid transparent', borderRadius: 6,
          fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700,
          color: '#0d0d0d', textDecoration: 'none',
        }}>
          Go to Sign In →
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={lbl}>New Password <span style={{ color: C.dim }}>(min 8 characters)</span></label>
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
          placeholder="••••••••" required minLength={8} autoFocus style={inp} />
      </div>

      <div>
        <label style={lbl}>Confirm Password</label>
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          placeholder="••••••••" required minLength={8} style={inp} />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: C.error, padding: '9px 12px', background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 6, fontFamily: 'monospace' }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading || !newPassword || !confirmPassword} style={{
        padding: '13px', background: loading || !newPassword || !confirmPassword ? '#1a1a1a' : C.gold,
        border: '1px solid transparent', borderRadius: 6,
        fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700,
        color: loading || !newPassword || !confirmPassword ? '#444' : '#0d0d0d',
        cursor: loading || !newPassword || !confirmPassword ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
      }}>
        {loading ? 'Updating…' : 'Reset Password →'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
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
              Reset password
            </h1>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: 0 }}>
              Choose a new password for your account.
            </p>
          </div>

          <Suspense fallback={null}>
            <ResetPasswordForm />
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
