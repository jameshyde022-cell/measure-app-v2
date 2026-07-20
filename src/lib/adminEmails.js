// Admin allowlist helpers, driven by the ADMIN_EMAILS env var
// (comma-separated list of admin email addresses).
//
// IMPORTANT: this file must stay dependency-free so it can be imported from
// src/middleware.js, which runs in the Next.js Edge runtime.

// Parse ADMIN_EMAILS into a normalized (trimmed, lowercased) list.
export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

// Returns true only if `email` is present in ADMIN_EMAILS.
// Fails closed: if ADMIN_EMAILS is unset/empty, no one is an admin.
export function isAdminEmail(email) {
  if (!email) return false
  const admins = getAdminEmails()
  if (admins.length === 0) return false
  return admins.includes(email.toLowerCase())
}
