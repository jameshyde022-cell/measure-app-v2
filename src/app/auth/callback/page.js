'use client'

import { useEffect, useState } from 'react'

export default function AuthCallback() {
  const [status, setStatus] = useState('Completing sign in…')

  useEffect(() => {
    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const errorParam = params.get('error')
        const errorDesc = params.get('error_description')

        if (errorParam) {
          console.error('[auth/callback] OAuth provider error:', errorParam, errorDesc)
          window.location.href = `/login?error=${encodeURIComponent(errorDesc || errorParam)}`
          return
        }

        if (!code) {
          console.error('[auth/callback] No code in URL. Params:', window.location.search)
          setStatus('Sign in failed — no auth code received. Redirecting…')
          setTimeout(() => { window.location.href = '/login' }, 2500)
          return
        }

        const res = await fetch('/api/auth/oauth-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          console.error('[auth/callback] oauth-callback API error:', res.status, data.error)
          setStatus(`Sign in failed: ${data.error || 'unknown error'}. Redirecting…`)
          setTimeout(() => { window.location.href = '/login' }, 2500)
          return
        }

        window.location.href = '/app'
      } catch (err) {
        console.error('[auth/callback] Unexpected error:', err)
        setStatus('Something went wrong. Redirecting…')
        setTimeout(() => { window.location.href = '/login' }, 2500)
      }
    }

    handleCallback()
  }, [])

  return (
    <div style={{
      background: '#0d0d0d', minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: '#f0ebe0',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#e8b84b', marginBottom: 20 }}>
          MEASURE
        </div>
        <div style={{ fontSize: 13, color: '#999' }}>{status}</div>
      </div>
    </div>
  )
}
