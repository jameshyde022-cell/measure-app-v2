export async function GET(request) {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://measure-app-hazel.vercel.app').replace(/\/$/, '')
  const debug = new URL(request.url).searchParams.get('debug') === '1'

  if (!supabaseUrl) {
    console.error('[auth/google] SUPABASE_URL is not set')
    return Response.redirect(`${appUrl}/login?error=config`)
  }

  // Generate PKCE code_verifier using Web Crypto (matches the rest of this codebase)
  const randomBytes = new Uint8Array(32)
  crypto.getRandomValues(randomBytes)
  const verifier = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  // code_challenge = BASE64URL(SHA256(verifier))
  const encoded = new TextEncoder().encode(verifier)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashBytes = new Uint8Array(hashBuffer)
  const challenge = btoa(String.fromCharCode(...hashBytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const redirectTo = `${appUrl}/auth/callback`

  const oauthUrl = new URL(`${supabaseUrl}/auth/v1/authorize`)
  oauthUrl.searchParams.set('provider', 'google')
  oauthUrl.searchParams.set('redirect_to', redirectTo)
  oauthUrl.searchParams.set('code_challenge', challenge)
  oauthUrl.searchParams.set('code_challenge_method', 's256')

  // The redirect_uri Google sees is set by Supabase — always {SUPABASE_URL}/auth/v1/callback.
  // That value must match exactly what is registered in Google Cloud Console.
  const expectedGoogleRedirectUri = `${supabaseUrl}/auth/v1/callback`

  console.log('[auth/google] SUPABASE_URL:', supabaseUrl)
  console.log('[auth/google] redirect_to (Supabase allowlist):', redirectTo)
  console.log('[auth/google] expected Google redirect_uri (Google Cloud Console):', expectedGoogleRedirectUri)
  console.log('[auth/google] full Supabase OAuth URL:', oauthUrl.toString())

  if (debug) {
    return Response.json({
      supabaseUrl,
      redirectTo,
      expectedGoogleRedirectUri,
      fullSupabaseOAuthUrl: oauthUrl.toString(),
      note: 'expectedGoogleRedirectUri must be in Google Cloud Console → OAuth client → Authorized redirect URIs. redirectTo must be in Supabase Dashboard → Auth → URL Configuration → Redirect URLs.',
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
