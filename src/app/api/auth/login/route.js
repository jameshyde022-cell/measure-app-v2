export const runtime = 'edge'

const SECRET = process.env.AUTH_SECRET ?? 'measure-dev-secret-replace-in-prod'

export async function POST(request) {
  let email
  try {
    const body = await request.json()
    email = body.email?.toLowerCase().trim()
  } catch (err) {
    console.error('[auth/login] Failed to parse request body:', err)
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  let token
  try {
    const payload = JSON.stringify({ email, iat: Date.now() })
    const encoder = new TextEncoder()

    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    token = btoa(payload) + '.' + btoa(String.fromCharCode(...new Uint8Array(sig)))

    console.log('[auth/login] Session token created for:', email)
  } catch (err) {
    console.error('[auth/login] Failed to sign session token:', err)
    return Response.json({ error: 'Failed to create session. Please try again.' }, { status: 500 })
  }

  const isProd = process.env.NODE_ENV === 'production'
  const cookie = [
    `measure_session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${30 * 24 * 60 * 60}`,
    isProd ? 'Secure' : '',
  ].filter(Boolean).join('; ')

  // Pass Set-Cookie in the Response constructor — Response.json() headers are
  // immutable in the Edge runtime so calling headers.set() after the fact silently
  // fails and the cookie is never sent.
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  })
}
