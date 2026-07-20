# MEASURE — Production Checklist

Status as of 2026-07-19 deployment (commit `12195f6`, live at `https://measure-app-v2-pl2.vercel.app`).

## Security
- [x] `AUTH_SECRET` set in Vercel production env (real random value); code throws if missing rather than using fallback
- [x] `/admin` + admin APIs require an allowlisted admin session (`ADMIN_EMAILS` set; verified live — non-admin session redirected, anonymous request to `/api/marketing-list` returns 403)
- [x] `subscribers` and `user_referrals` tables have RLS migration written — **NOT YET APPLIED to the database** (manual action required, see report)
- [x] Free daily export limit enforced server-side (DB-backed via `exported_images` row count), not just localStorage
- [x] Stripe webhook signature verified + idempotency migration written — **table NOT YET APPLIED** (manual action required)
- [x] No secret keys anywhere in client-side bundles (verified: no `NEXT_PUBLIC_STRIPE_*`, no client Supabase, no client Stripe SDK)
- [x] `.env` confirmed never committed to git (checked full history — clean)
- [ ] Two-test-user RLS cross-access check — not performed (requires DB access I don't have; recommend after migrations applied)

## Domain
- [x] `measureapp.pro` + `www.measureapp.pro` added to Vercel project (`measure-app-v2-pl2`)
- [ ] DNS records updated at registrar — **manual action required**, domain still resolves to a parking page
- [ ] HTTPS active on `measureapp.pro` — blocked on DNS
- [x] `www.measureapp.pro` → apex redirect implemented (Next.js host-based redirect in `next.config.js`)
- [x] Single `NEXT_PUBLIC_APP_URL` env var used everywhere; production value corrected from a stale `http://localhost:3000` to `https://measureapp.pro`
- [x] No remaining hardcoded `vercel.app`/`localhost` references in code (verified via grep + build)

## Auth
- [x] Signup — tested live against production API, works
- [x] Login — tested live, session cookie issued (HttpOnly + Secure), works
- [x] Logout — route unchanged/untouched, was already working
- [ ] Google OAuth — code reviewed (correct server-side PKCE), not live-tested (would require a real Google account interaction)
- [x] Password reset flow — built (did not exist before), build-verified, not live-tested end-to-end (requires receiving a real email)
- [x] Email verification — documented decision: auto-confirm bypass kept for launch (see report)

## Editor / Core Workflow
- [x] Upload — code reviewed, file-size validation added, build passes
- [x] Background removal (Gemini ghost-mannequin) — pre-existing, working; error handling improved
- [x] Skip background removal — pre-existing, working
- [x] Crop/reposition step — built (did not exist before), build-verified, not live-interaction-tested (no browser automation available this session)
- [x] Add/move/edit/delete measurement lines — pre-existing, untouched, working
- [x] Line colors, labels, values — pre-existing, untouched, working
- [x] Item name + notes — pre-existing, untouched, working
- [x] Legend renders in export — pre-existing, untouched
- [x] Export PNG — null-ref crash fixed, `toBlob` pattern corrected
- [x] Free-tier watermark now shows correct domain (`measureapp.pro` via env var, was hardcoded to a defunct Vercel URL)

## Free/Pro Business Rules
- [x] 3 exports/day free limit enforced server-side (was client-only, trivially bypassed — now fixed)
- [x] Limit-reached message + upgrade prompt shown (existing UI, now driven by server 403)
- [x] Pro grants expanded access — pre-existing logic, untouched
- [x] Pro access persists via DB (`is_pro` column), not session/localStorage
- [x] Pro status only ever driven by DB, verified in code (`/success` page is UI-only, confirmed)

## Stripe
- [x] Live-mode monthly price confirmed active ($9.99/mo, `price_1TKme1AchI5lpRlrx1RqdVI2`)
- [ ] Yearly price — **not configured**, `STRIPE_PRICE_ID_YEARLY` empty in production; yearly checkout will 500 until you create a live Price and give me the ID (or I remove the yearly option)
- [x] Checkout success/cancel URLs point to `NEXT_PUBLIC_APP_URL` (now correctly `measureapp.pro`)
- [x] Webhook endpoint created and registered in Stripe (previously **none existed** for this app — critical gap found and fixed), currently pointed at `measure-app-v2-pl2.vercel.app`, needs updating to `measureapp.pro` once DNS is live
- [x] Webhook idempotency code written — inert until migration 008 is applied
- [x] Customer Portal built (did not exist before) — route + UI button added, not live-tested (requires a real subscription)
- [x] Cancellation flow — pre-existing, untouched, working

## Legal / Business Pages
- [x] Terms of Service — built, live-verified (200)
- [x] Privacy Policy — built, live-verified (200)
- [x] Refund/Cancellation Policy — built, live-verified (200)
- [x] Contact/Support page — built, live-verified (200)
- [x] Footer links to all of the above from every page (new shared `Footer.js`, wired into root layout)

## Error Handling / SEO
- [x] Custom 404 page — built, live-verified (returns 404 status)
- [x] Custom error boundary page — built
- [x] Favicon + app icons — added from existing PWA icon assets
- [x] robots.txt — live-verified, correctly points to `measureapp.pro/sitemap.xml`
- [x] sitemap.xml — built
- [x] Open Graph metadata — pre-existing, now uses corrected `metadataBase`

## Analytics / Monitoring
- [x] Funnel events added (signup, login, upload, bg-removal used/skipped/failed, crop, limit reached, upgrade clicked, checkout started/completed, export attempted/completed/failed)
- [x] No sensitive image/measurement content included in event properties (reviewed)
- [ ] Structured error monitoring (e.g. Sentry) — not added, post-launch improvement

## Testing
- [x] `next build` succeeds (verified repeatedly after every phase)
- [ ] Lint — pre-existing gap, ESLint was never configured in this project; not blocking (build itself does full compilation)
- [ ] Manual full user journey walkthrough — partial: signup/login/session/auth-gating verified live via direct API calls; full editor/export/Stripe walkthrough not done via browser (no browser automation available this session)
- [ ] Mobile walkthrough — not performed this session
- [ ] Browser console check — not performed (no browser session)
- [x] Server behavior spot-checked via live curl tests (signup, login, session, protected routes, admin gating — all correct)

## Deployment
- [x] Env vars reviewed and corrected in Vercel production (`AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `ADMIN_EMAILS` added/fixed; `STRIPE_WEBHOOK_SECRET` rotated to match new endpoint)
- [x] Production deployed (commit `12195f6`, deployment ready, verified live)
- [x] Live production URL manually verified post-deploy (multiple endpoints checked, real signup/login flow tested)
