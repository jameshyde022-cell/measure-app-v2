import { NextResponse } from 'next/server'
import { getAuthSecret } from './lib/authSecret'
import { isAdminEmail } from './lib/adminEmails'

// Verifies the session cookie's HMAC signature and expiry.
// Returns the decoded payload object when valid, otherwise null.
async function verifySession(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [payloadB64, sigB64] = parts
    const payload = atob(payloadB64)
    const data = JSON.parse(payload)

    // Reject expired sessions (30 days)
    if (!data.iat || Date.now() - data.iat > 30 * 24 * 60 * 60 * 1000) return null

    const SECRET = getAuthSecret()
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig)))

    return expectedSig === sigB64 ? data : null
  } catch {
    return null
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('measure_session')?.value
  const session = token ? await verifySession(token) : null

  if (!session) {
    console.log(`[middleware] unauthenticated request to ${pathname} — redirecting to /login`)
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes require an admin email in addition to a valid session.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!isAdminEmail(session.email)) {
      console.log(`[middleware] non-admin ${session.email} blocked from ${pathname} — redirecting to /app`)
      const appUrl = request.nextUrl.clone()
      appUrl.pathname = '/app'
      appUrl.search = ''
      return NextResponse.redirect(appUrl)
    }
  }

  console.log(`[middleware] valid session for ${pathname}`)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/app', '/app/:path*',
    '/inventory', '/inventory/:path*',
    '/profile', '/profile/:path*',
    '/admin', '/admin/:path*',
  ],
}
