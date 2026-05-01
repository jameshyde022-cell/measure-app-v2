import { NextResponse } from 'next/server'

// AUTH_SECRET must be set in your environment variables.
// Generate one with: openssl rand -base64 32
const SECRET = process.env.AUTH_SECRET ?? 'measure-dev-secret-replace-in-prod'

async function verifySession(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return false

    const [payloadB64, sigB64] = parts
    const payload = atob(payloadB64)
    const data = JSON.parse(payload)

    // Reject expired sessions (30 days)
    if (!data.iat || Date.now() - data.iat > 30 * 24 * 60 * 60 * 1000) return false

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig)))

    return expectedSig === sigB64
  } catch {
    return false
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('measure_session')?.value

  if (!token || !(await verifySession(token))) {
    console.log(`[middleware] unauthenticated request to ${pathname} — redirecting to /login`)
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  console.log(`[middleware] valid session for ${pathname}`)
  return NextResponse.next()
}

export const config = {
  matcher: ['/app', '/app/:path*', '/inventory', '/inventory/:path*'],
}
