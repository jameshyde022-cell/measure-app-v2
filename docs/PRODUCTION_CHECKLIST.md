# MEASURE — Production Checklist

Status as of 2026-07-20, production domain cutover + Data Cache fix (commit `1ba38e8`). Live at both `https://measure-app-v2-pl2.vercel.app` and `https://measureapp.pro`.

## Security
- [x] `AUTH_SECRET` set in Vercel production env (real random value, rotated from an empty live value found during audit); code throws if missing rather than using fallback
- [x] `/admin` + admin APIs require an allowlisted admin session (`ADMIN_EMAILS=jameshyde022@gmail.com`; verified live via direct browser test — non-admin account redirected off `/admin`, `/api/marketing-list` returns Forbidden)
- [x] `subscribers` and `user_referrals` RLS — confirmed active in the database: tested with a real anonymous request (blocked) and a real authenticated user JWT (blocked at the same strict level — see note below)
- [x] Free daily export limit enforced server-side — confirmed via real browser test: 3 exports succeed, 4th blocked with correct message
- [x] Stripe webhook idempotency — migration `008` applied and verified: real signed event processed and recorded, duplicate delivery of the same event correctly skipped (`duplicate: true`), invalid signatures rejected (400)
- [x] No secret keys anywhere in client-side bundles
- [x] `.env` confirmed never committed to git
- [x] Two-test-user RLS cross-access check — performed with real Supabase JWTs; anon and authenticated-self both blocked from `subscribers`/`user_referrals` via the public API (stricter than the minimum bar — app is unaffected since it only ever reads via service-role server routes)
- [x] **Found and fixed a serious Data Cache poisoning bug**: Next.js/Vercel caches `supabase-js`'s internal `fetch` calls by default, keyed on the exact query URL. During a brief earlier misconfiguration window, one query got a stale/empty result cached, which then persisted indefinitely — a real, live symptom of this was a paying test account showing as free-tier in `/api/auth/me` while `/api/profile` (a differently-shaped query, different cache key) correctly showed Pro. Applied `cache: 'no-store'` to every one of the 16 server-side Supabase client construction sites in the codebase (confirmed 16/16 via grep), including the shared `getSupabase()` helper that backs the daily-export-limit check — this was a real risk to that specific security fix, not just a display issue. Verified live: Pro status now agrees across all endpoints.

## Domain
- [x] `measureapp.pro` + `www.measureapp.pro` added to Vercel project (`measure-app-v2-pl2`)
- [x] DNS records updated at registrar (A `76.76.21.21` for apex, CNAME for www) — propagated to Google's resolver and Vercel's edge; confirmed via direct connection and via `openssl s_client`
- [x] HTTPS active — valid Let's Encrypt cert for `measureapp.pro` confirmed (`notBefore: Jul 20 2026`, auto-renewing via Vercel)
- [x] `www.measureapp.pro` → apex redirect — both code-level (`next.config.js`) and platform-level (Vercel domain redirect, 308) confirmed live
- [x] Single `NEXT_PUBLIC_APP_URL=https://measureapp.pro` in production; watermark, auth redirects, Stripe URLs, robots.txt/sitemap all confirmed using it correctly on the live domain
- [x] No remaining hardcoded `vercel.app`/`localhost` references

## Auth
- [x] Signup — verified live (rate-limited during heavy testing today, which is the limiter working correctly, not a bug)
- [x] Login — verified live via real browser test, session cookie HttpOnly+Secure
- [x] Logout — verified live via real browser test
- [ ] Google OAuth — code reviewed (correct server-side PKCE); exact required Google Cloud Console / Supabase redirect URLs identified and given to you; not interactively tested (requires a real Google account)
- [x] Password reset — built, request-UI verified live via real browser test; full email-click-through not tested (requires receiving real email)
- [x] Email verification — documented decision: auto-confirm bypass kept for launch

## Editor / Core Workflow
- [x] Upload — verified live via real browser test; file-size validation in place; non-image file correctly rejected (verified live)
- [x] Background removal (Gemini) — pre-existing, working
- [x] Skip background removal — verified live via real browser test
- [x] Crop/reposition — **verified live via real browser test**: drag-to-resize confirmed, crop applied correctly, screenshots reviewed
- [x] Add/edit/delete measurement lines — verified live via real browser test
- [x] Item name + notes — verified live via real browser test
- [x] Export PNG — verified live via real browser test; watermark screenshot reviewed and confirms correct `measureapp.pro` text
- [x] Free-tier watermark shows correct domain — confirmed visually in an actual exported image

## Free/Pro Business Rules
- [x] 3 exports/day free limit — verified live via real browser test (1st-3rd succeed, 4th blocked with correct message and disabled button)
- [x] Limit-reached message + upgrade prompt — verified live
- [x] Pro status only ever driven by DB, never client state — verified in code
- [x] **Pro access grant end-to-end — fully verified live**: signed webhook event → `is_pro=true` written to DB → confirmed matching in both `/api/profile` and `/api/auth/me` (the one the editor UI actually uses) after the cache fix

## Stripe
- [x] Live-mode monthly price confirmed active ($9.99/mo)
- [x] Yearly price created ($29.99/yr, `price_1TvDCZAchI5lpRlrqoWIYfiS`), env var set, redeployed, both monthly and yearly Checkout Session creation verified live (real Stripe sessions created then immediately expired, no charge)
- [x] Checkout success/cancel URLs point to `measureapp.pro`
- [x] Webhook endpoint — cleaned up (found and removed 2 accidental duplicates), one clean endpoint registered at `https://measureapp.pro/api/webhook`, signing secret rotated and matched in Vercel
- [x] Webhook idempotency — **fully verified live**: first delivery processed (`received:true`), duplicate delivery of the same event ID correctly skipped (`received:true, duplicate:true`)
- [x] Invalid webhook signatures rejected — confirmed live (400)
- [x] Customer Portal built — route + UI added; not live-tested with a real subscription (none exists yet, would require a real charge)
- [x] Cancellation flow — pre-existing, untouched

## Legal / Business Pages
- [x] Terms, Privacy, Refund Policy, Contact — all built and live-verified on `measureapp.pro`
- [x] Footer links confirmed live and visible in browser screenshots

## Error Handling / SEO
- [x] Custom 404 — verified live via real browser test (branded page, correct 404 status)
- [x] Custom error boundary — built
- [x] Favicon + icons — present
- [x] robots.txt — verified live on `measureapp.pro`, correctly self-referencing
- [x] sitemap.xml — built
- [x] Open Graph metadata — correct

## Analytics / Monitoring
- [x] Funnel events added across signup/login/upload/editor/export/checkout
- [x] No sensitive content in event properties
- [ ] Structured error monitoring (Sentry etc.) — not added, post-launch improvement

## Testing
- [x] `next build` succeeds (verified repeatedly)
- [ ] Lint — pre-existing gap (ESLint never configured), not blocking
- [x] **Full interactive Playwright test suite built and run against live production** — 10/11 test areas fully passing via real browser automation (homepage, 404, login/logout, password-reset UI, admin rejection, two-account isolation, full upload→crop→annotate→export flow, file validation, daily limit enforcement, Stripe checkout redirect, mobile layout). Test suite committed to the repo (`e2e/`) for future reuse.
- [x] Mobile layout — verified live via screenshot review, clean and functional
- [x] Browser console errors — captured across the full suite, nothing unexpected found
- [ ] Minor non-blocking finding: `/inventory` page may not reflect the most recent export without a manual refresh (client-side staleness, not a security/data issue — server-side counts proven correct)

## Deployment
- [x] All required env vars set/corrected in Vercel production
- [x] Production deployed and live on both the Vercel domain and `measureapp.pro`
- [x] Live production URL manually verified extensively (this checklist)
