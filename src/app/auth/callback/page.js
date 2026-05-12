'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function AuthCallback() {
  const [status, setStatus] = useState('Completing sign in…')

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      setStatus('Configuration error. Please try again.')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    async function handleCallback() {
      try {
        // Exchange the code in the URL for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        )

        if (error || !data?.session?.user?.email) {
          console.error('[auth/callback] Exchange failed:', error?.message)
          setStatus('Sign in failed. Redirecting…')
          setTimeout(() => { window.location.href = '/login' }, 2000)
          return
        }

        const email = data.session.user.email

        // Issue a measure_session cookie via our API
        const res = await fetch('/api/auth/oauth-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            accessToken: data.session.access_token,
          }),
        })

        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          console.error('[auth/callback] oauth-callback API error:', d.error)
          setStatus('Sign in failed. Redirecting…')
          setTimeout(() => { window.location.href = '/login' }, 2000)
          return
        }

        window.location.href = '/app'
      } catch (err) {
        console.error('[auth/callback] Unexpected error:', err)
        setStatus('Something went wrong. Redirecting…')
        setTimeout(() => { window.location.href = '/login' }, 2000)
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
