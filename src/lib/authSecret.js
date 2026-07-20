// Returns the HMAC secret used to sign/verify session cookies.
//
// IMPORTANT: this file must stay dependency-free so it can be imported from
// src/middleware.js, which runs in the Next.js Edge runtime.
//
// Generate a secret with: openssl rand -base64 32
export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET
  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET environment variable must be set in production')
  }

  // Local development only: keeps the app working without env setup.
  return 'measure-dev-secret-replace-in-prod'
}
