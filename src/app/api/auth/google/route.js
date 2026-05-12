import { createHash, randomBytes } from 'crypto'

export async function GET(request) {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://measure-app-hazel.vercel.app').replace(/\/$/, '')
  const debug = new URL(request.url).searchParams.get('debug') === '1'

  if (!supabaseUrl) {
    console.error('[auth/google] SUPABASE_URL is not set')
    return Response.redirect(`${appUrl}/login?error=config`)
  }

  // Generate PKCE verifier + challenge
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')

  const redirectTo = `${appUrl}/auth/callback`

  const oauthUrl = new URL(`${supabaseUrl}/auth/v1/authorize`)
  oauthUrl.searchParams.set('provider', 'google')
  oauthUrl.searchParams.set('redirect_to', redirectTo)
  oauthUrl.searchParams.set('code_challenge', challenge)
  oauthUrl.searchParams.set('code_challenge_method', 's256')

  // The redirect_uri Google will receive is set by Supabase internally.
  // It is always: {SUPABASE_URL}/auth/v1/callback
  // That value must match exactly what is in Google Cloud Console.
  const expectedGoogleRedirectUri = `${supabaseUrl}/auth/v1/callback`

  console.log('[auth/google] SUPABASE_URL value:', supabaseUrl)
  console.log('[auth/google] redirect_to (sent to Supabase, must be in Supabase redirect allowlist):', redirectTo)
  console.log('[auth/google] expected Google redirect_uri (must be in Google Cloud Console):', expectedGoogleRedirectUri)
  console.log('[auth/google] full Supabase OAuth URL:', oauthUrl.toString())

  // Return debug info without redirecting when ?debug=1
  if (debug) {
    return Response.json({
      supabaseUrl,
      redirectTo,
      expectedGoogleRedirectUri,
      fullSupabaseOAuthUrl: oauthUrl.toString(),
      note: 'expectedGoogleRedirectUri must be registered in Google Cloud Console → OAuth client → Authorized redirect URIs. redirectTo must be in Supabase Dashboard → Auth → URL Configuration → Redirect URLs.',
    })
  }

  const isProd = process.env.NODE_ENV === 'production'
  const verifierCookie = [
    `oauth_verifier=${verifier}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600',
    isProd ? 'Secure' : '',
  ].filter(Boolean).join('; ')

  return new Response(null, {
    status: 302,
    headers: {
      Location: oauthUrl.toString(),
      'Set-Cookie': verifierCookie,
    },
  })
}
