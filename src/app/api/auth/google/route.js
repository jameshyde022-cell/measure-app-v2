import { createHash, randomBytes } from 'crypto'

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://measure-app-hazel.vercel.app'

  if (!supabaseUrl) {
    console.error('[auth/google] SUPABASE_URL is not set')
    return Response.redirect(`${appUrl}/login?error=config`)
  }

  // Generate PKCE verifier + challenge
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')

  const oauthUrl = new URL(`${supabaseUrl}/auth/v1/authorize`)
  oauthUrl.searchParams.set('provider', 'google')
  oauthUrl.searchParams.set('redirect_to', `${appUrl}/auth/callback`)
  oauthUrl.searchParams.set('code_challenge', challenge)
  oauthUrl.searchParams.set('code_challenge_method', 's256')

  const isProd = process.env.NODE_ENV === 'production'
  const verifierCookie = [
    `oauth_verifier=${verifier}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600',
    isProd ? 'Secure' : '',
  ].filter(Boolean).join('; ')

  console.log('[auth/google] Redirecting to Supabase OAuth, redirect_to:', `${appUrl}/auth/callback`)

  return new Response(null, {
    status: 302,
    headers: {
      Location: oauthUrl.toString(),
      'Set-Cookie': verifierCookie,
    },
  })
}
