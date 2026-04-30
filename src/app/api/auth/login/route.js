export const runtime = 'edge'

const SECRET = process.env.AUTH_SECRET ?? 'measure-dev-secret-replace-in-prod'

export async function POST(request) {
  let email
  try {
    const body = await request.json()
    email = body.email?.toLowerCase().trim()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  const payload = JSON.stringify({ email, iat: Date.now() })
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const token = btoa(payload) + '.' + btoa(String.fromCharCode(...new Uint8Array(sig)))

  const isProd = process.env.NODE_ENV === 'production'
  const cookie = [
    `measure_session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${30 * 24 * 60 * 60}`,
    isProd ? 'Secure' : '',
  ].filter(Boolean).join('; ')

  const res = Response.json({ ok: true })
  res.headers.set('Set-Cookie', cookie)
  return res
}
