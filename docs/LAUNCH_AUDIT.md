# MEASURE — Launch Audit

Date: 2026-07-19
Codebase audited: `C:\Users\Admin\Downloads\measure-app\measure-app` (GitHub: `jameshyde022-cell/measure-app-v2`, Vercel project `measure-app`)
Method: Direct inspection + 5 parallel research passes over the full `src/`, `supabase/`, and config tree, plus manual verification of the highest-risk findings.

> Note on scope vs. the original brief: the actual product is larger than described. Beyond the measurement editor, it also includes an **inventory dashboard**, an **AI eBay-listing generator** (Anthropic), **AI ghost-mannequin / model-dressup image generation** (Google Gemini — this is what actually does "background removal," not PixLab), and a **referral/influencer program** with an admin panel. All of these are now in scope for launch review since they're live, reachable routes.

---

## Critical / Launch Blockers

### B1. Free-tier daily export limit is enforced only in the browser
**Evidence:** `src/components/MeasureTool.js` — `FREE_MAX_EXPORTS_PER_DAY = 3` is tracked via `localStorage` (`measure_exports_<email>_<date>`), checked client-side only. `src/app/api/inventory/save-export/route.js` performs no server-side count check.
**Impact:** Any user bypasses the free limit by clearing localStorage, using a private window, or calling `/api/inventory/save-export` directly. Business rule is unenforced — free users get unlimited exports today.
**Fix:** Move the count to a DB-backed, server-checked counter (date-keyed row per user, incremented atomically inside the save-export route, before the row is written). Reject with a clear error once `is_pro=false` and count ≥ 3 for the current day (server-defined timezone, e.g. UTC).

### B2. `AUTH_SECRET` has an insecure hardcoded fallback
**Evidence:** `src/middleware.js:5`, `src/lib/auth.js:3`, `src/app/api/profile/route.js:4`, `src/app/api/profile/cancel/route.js:4`, `src/app/api/auth/login/route.js:3` all do `process.env.AUTH_SECRET ?? 'measure-dev-secret-replace-in-prod'`.
**Impact:** If `AUTH_SECRET` is not set in the Vercel production environment, every session cookie is signed with a publicly-known string (it's in this audit and in the repo). Anyone could forge a valid `measure_session` cookie for any email and log in as any user.
**Fix:** Confirmed unset/set status must be checked in Vercel prod env (manual verification required — see Manual Actions). Code should be changed to throw at startup if `AUTH_SECRET` is missing in production rather than silently falling back.

### B3. Admin panel and 3 admin APIs have zero authentication
**Correction:** an earlier automated pass mis-reported that `/profile` (the customer account page) re-exports the admin page. Verified directly by reading `src/app/profile/page.js` — that is false. `/profile` is a legitimate, separate customer billing/referral page. Only `/admin/page.js` re-exports `admin-page.js`, which is the actual problem below.
**Evidence:** `/admin` route is not covered by `src/middleware.js` matcher (`['/app','/app/:path*','/inventory','/inventory/:path*','/profile','/profile/:path*']` — no `/admin`). `src/app/api/marketing-list/route.js`, `src/app/api/influencers/influencers-route.js`, and `src/app/api/create-influencer/create-influencer-route.js` have no auth check of any kind — not even a login requirement.
**Impact:** Any anonymous visitor who requests `GET /api/marketing-list` today receives every user's email, plan, join date, and last-active date. Anyone can `POST /api/create-influencer` to mint referral codes with fake earnings. This is an active data-exposure vulnerability, not a theoretical one.
**Fix:** Add an admin allowlist (env var of admin emails, or an `is_admin` column) and require it in all three routes plus the `/admin` page (add to middleware matcher with a role check, not just "logged in").

### B4. Two Supabase tables have no RLS policies
**Evidence:** `subscribers` and `user_referrals` tables (created in `supabase/migrations/005_*.sql`) have no `CREATE POLICY` statements anywhere in migrations. Only `exported_images` has RLS (migration `006_exported_images_rls.sql`).
**Impact:** Currently mitigated because the app only touches these tables via the service-role key server-side, and the anon key is never exposed to the client for these tables specifically. But this is a landmine: any future code (or a bug) that queries `subscribers`/`user_referrals` with the anon key would have no protection against a user reading or writing another user's `is_pro`, Stripe IDs, or referral state.
**Fix:** Add RLS to both tables, default-deny, with row ownership tied to `auth.jwt() ->> 'email'` matching `exported_images`' pattern, and no client write policy at all (writes only via service role).

### B5. `measureapp.pro` is not connected to Vercel
**Evidence:** Direct DNS/HTTP check: `measureapp.pro` currently resolves to registrar parking-page IPs and serves a JS redirect to `/lander` — a domain-for-sale/parking page, not Vercel.
**Impact:** The production domain does not serve the app at all right now.
**Fix:** Manual action required — see Manual Actions section.

### B6. No legal pages exist
**Evidence:** No `terms`, `privacy`, or `refund`/cancellation route anywhere under `src/app`. Only a `mailto:` link on the homepage for contact.
**Impact:** Cannot legally or credibly launch a paid SaaS product without Terms of Service and a Privacy Policy, especially one that processes uploaded images through third-party AI APIs (Gemini, Anthropic) and handles payments (Stripe). Also required by Stripe's own terms of service for merchants.
**Fix:** Build Terms of Service, Privacy Policy, Refund/Cancellation Policy, and a real Contact/Support page; link from footer and Stripe Checkout.

### B7. No password-reset flow exists at all
**Evidence:** No file or route anywhere containing `reset-password`, `forgot-password`, or a call to Supabase's `resetPasswordForEmail`.
**Impact:** A user who forgets their password has no way to regain access. This is an explicit launch requirement.
**Fix:** Build forgot-password request page + reset-password confirmation page using Supabase Auth's password-recovery flow, redirecting to the production domain.

### B8. Hardcoded `vercel.app` fallback domains, including inside exported images
**Evidence:**
- `src/components/MeasureTool.js:413` — the **free-tier watermark baked into every exported PNG** literally says `"Free Version - measure-app-v2-pl2.vercel.app"`.
- `src/app/api/auth/signup/route.js:27` and `src/app/api/auth/google/route.js:3` — fallback to `https://measure-app-hazel.vercel.app` if `NEXT_PUBLIC_APP_URL` isn't set.
**Impact:** Every free export currently advertises a defunct/wrong domain to the seller's customers. Auth redirects could silently fall back to an old preview URL if the env var is ever misconfigured.
**Fix:** Replace with `measureapp.pro` (via the single `NEXT_PUBLIC_APP_URL` env var, no hardcoding).

### B9. Environment variable for base URL is inconsistent (3 different names)
**Evidence:** Code references `NEXT_PUBLIC_APP_URL` (Stripe, auth redirects), `NEXT_PUBLIC_SITE_URL` (metadata only, `layout.js:5`), and `.env` defines an unused `APP_BASE_URL`.
**Impact:** Easy to update one and miss another; exactly the kind of drift that caused B8.
**Fix:** Standardize on `NEXT_PUBLIC_APP_URL` everywhere per the brief; remove `APP_BASE_URL` and `NEXT_PUBLIC_SITE_URL`.

### B10. No crop/positioning tool
**Evidence:** No crop library in `package.json`, no crop component anywhere in `src/`.
**Impact:** Explicit required workflow step in the launch brief ("Crop or position the garment correctly") does not exist today.
**Fix:** Add a minimal crop/reposition step between upload and annotate phases.

### B11. Stripe webhook has no idempotency protection
**Evidence:** `src/app/api/webhook/webhook-route.js` processes `checkout.session.completed`, `customer.subscription.updated/created/deleted` with no stored record of processed event IDs.
**Impact:** Stripe retries webhook delivery on timeout/failure; duplicate delivery could double-increment referral counters (`user_referrals`, `referrals` RPC calls in the `created` handler) even though the `subscribers` upsert itself is idempotent via `onConflict: email`.
**Fix:** Store processed `event.id`s (new table or a column check) and no-op on repeat delivery.

### B12. No Stripe Customer Portal
**Evidence:** Only `src/app/api/profile/cancel/route.js` exists, which sets `cancel_at_period_end: true` directly. No `stripe.billingPortal.sessions.create` call anywhere.
**Impact:** Users cannot update a payment method or view invoices — explicitly required by the brief ("Manage or cancel the subscription", "Customer Portal return URL").
**Fix:** Add a portal-session route + a "Manage Billing" button on the profile/billing page, `return_url` pointing at `NEXT_PUBLIC_APP_URL`.

### B13. Yearly Stripe price not configured
**Evidence:** `STRIPE_PRICE_ID_YEARLY` is referenced in code and fully wired into the pricing UI (`src/app/pricing/page.js`), but not set in `.env`; `checkout-route.js` has a `// TODO: Create a yearly price in Stripe dashboard` and will 500 if a user picks yearly.
**Impact:** Yearly plan is visibly offered but broken.
**Fix:** Requires creating a live-mode yearly Price in the Stripe Dashboard — manual action (see below) — then setting the env var.

---

## High Priority

### H1. Email verification is bypassed, not fixed
`src/app/api/auth/signup/route.js:49-61` auto-confirms every signup via `supabase.auth.admin.updateUserById(..., { email_confirm: true })`, with a comment saying to remove this once SMTP is configured. This means anyone can sign up with an email they don't own. Decision needed: keep as an intentional, documented launch simplification (low fraud risk for this product) or wire real SMTP-based verification (requires an SMTP provider + API key from you). Recommend documenting this explicitly as a known limitation for launch, since blocking on SMTP setup isn't strictly required by the brief's completion criteria, but disclosing it is.

### H2. No error pages
No `not-found.js`/`error.js`/`global-error.js`. Next.js default error UI will show, which is unbranded and can leak stack traces in some configurations.

### H3. No favicon, robots.txt, or sitemap.xml
`public/` has PWA icons but no `favicon.ico`/`apple-touch-icon.png`, no `robots.txt`, no `sitemap.xml`. SEO/indexing behavior is currently undefined.

### H4. Editor bugs found during code review
`src/components/MeasureTool.js`:
- Line ~427: `handleExport()` dereferences `exportRef.current.width` with no null check (crashes if ref isn't mounted) — contrast with `handleDownload()` which correctly guards this.
- No `img.onerror` handler anywhere images are loaded from user files — a corrupt/unsupported file silently hangs the UI with no error message.
- No client or server file-size validation anywhere images are uploaded (`ghost-mannequin`, `model-dressup`, `save-export` routes) — large files can exhaust memory or time out.
- `toBlob(async (blob) => {...})` — passing an async function as the `toBlob` callback is incorrect API usage; works today but masks unhandled rejections and can trigger "set state after unmount" warnings.

### H5. Live Stripe secret key sits in a local `.env` file
Confirmed `.env` was never committed to git (checked full history) and is correctly gitignored. Still: this is a **live-mode** secret key (`sk_live_...`) sitting in a plaintext file on a personal machine. Recommend treating it as sensitive, not copying it elsewhere, and confirming the same live key (or a key with equivalent scope) is what's actually set in Vercel's production environment — not a leftover test key.

### H6. Affiliate coupon ID mismatch
`.env` defines `STRIPE_AFFILIATE_COUPON_ID` but `checkout-route.js:10` hardcodes a different literal coupon ID (`'Ag7Ld0Fp'`). The env var is dead. Confirm which coupon is actually intended to be live and fix the mismatch.

### H7. Unused PhotoRoom integration (dead code, not a bug, but confusing)
`src/app/api/remove-bg/route.js` implements a full PhotoRoom background-removal call using `PHOTOROOM_API_KEY`, but nothing in the app calls this route — the actual "ghost mannequin" background-removal feature uses `src/app/api/ghost-mannequin/route.js` via Google Gemini instead. This is dead code left from an earlier architecture. Per instructions not to rebuild working systems, we'll leave the working Gemini path alone and just flag `remove-bg` as unused (candidate for removal or documentation, not urgent).

### H8. Route re-export pattern is inconsistent/incomplete refactor
Several API routes are thin `route.js` wrappers re-exporting from a sibling `*-route.js` file (`checkout`, `webhook`, `check-code`, `create-influencer`, `influencers`), while others put logic directly in `route.js`. Not a bug, but worth normalizing for maintainability — low priority, not blocking launch.

### H9. Zero automated test coverage
No test files, no test runner configured. All verification for this launch will be manual/scripted smoke testing.

---

## Medium Priority

- `session token` generation (`makeSessionToken()`) is duplicated identically in `login/route.js` and `oauth-callback/route.js` — extract to shared util.
- No `.env.example` documenting required environment variables for a fresh deploy.
- No analytics events beyond Vercel's automatic pageview/web-vitals — no funnel tracking (signup started/completed, export completed, limit reached, upgrade clicked, etc.) as required by the brief.
- `console.log` statements throughout server routes (40+) — fine for now as basic structured-ish logging, but noisy; no dedicated error-monitoring service (Sentry etc.) configured.
- Free tier is also capped at 4 measurement lines (`MeasureTool.js` line ~272) — this business rule exists but isn't mentioned in the brief; confirm it's intentional and document it alongside the 3-export/day rule.
- Mobile packaging (Capacitor + `android/`) exists with gradle files and build intermediates present, but has not been verified to produce a working release build — out of scope for the web launch but flagged for awareness given `Measure - Google Play package` artifacts found on this machine.

---

## Post-Launch Improvements

- Normalize the `route.js` / `*-route.js` split.
- Remove dead `remove-bg` PhotoRoom route or repurpose it.
- Add Sentry or similar structured error monitoring.
- Add automated tests (auth flow, webhook handling, RLS).
- Revisit whether real SMTP email verification should replace the auto-confirm bypass.
- Review Android/Capacitor packaging separately from the web launch.

---

## What's Actually Working Well (don't rebuild)

- Server-side Pro-status verification is done correctly: the `/success` page is UI-only and does **not** grant access; actual gating reads `is_pro` from the `subscribers` table via `/api/profile`, which is only ever written by the Stripe webhook. This is the right architecture — keep it.
- Stripe secret keys are never exposed client-side; no `NEXT_PUBLIC_STRIPE_*` vars, no client-side Stripe SDK usage.
- Service-role Supabase key is only ever imported in server-side API route files.
- Google OAuth uses a correct server-side PKCE flow.
- `exported_images` table RLS policies are correctly scoped to the owning user's email via `auth.jwt()`.
- The core measurement-line editor (add/select/move/delete/color/label/value/legend) and PNG export pipeline are functionally complete and reasonably well structured in a single `MeasureTool.js` component — no duplicate/competing implementations found.
- "Skip background removal" (flat-lay mode) works and is fully wired.
- `.gitignore` correctly excludes `.env`/`.env.local`; confirmed never committed to git history.
