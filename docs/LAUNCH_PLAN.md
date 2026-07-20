# MEASURE — Launch Plan

Companion to `docs/LAUNCH_AUDIT.md`. Organized into phases by file overlap (to allow safe parallel work) and by risk level (to route to the right agent tier). Each phase below is dispatched as a scoped task packet with explicit acceptance criteria; nothing is marked done until reviewed against a real diff.

## Phase 1 — Core security fixes (opus-builder)
Files: `src/middleware.js`, `src/lib/auth.js`, `src/app/api/profile/route.js`, `src/app/api/profile/cancel/route.js`, `src/app/api/auth/login/route.js`, `src/app/api/inventory/save-export/route.js`, `src/app/admin/*`, `src/app/api/marketing-list/route.js`, `src/app/api/influencers/*`, `src/app/api/create-influencer/*`, new Supabase migration.
- B2: `AUTH_SECRET` must fail hard (throw) if unset in production instead of using the hardcoded fallback.
- B3: admin allowlist (env var of admin emails) enforced on `/admin` page + all 3 admin APIs.
- B4: RLS policies added for `subscribers` and `user_referrals` (default-deny, no client write policy).
- B1: server-side, DB-backed daily export counter enforced in `save-export` route before the free-tier export is accepted.

## Phase 2 — Stripe hardening (opus-builder, parallel with Phase 1 — no file overlap)
Files: `src/app/api/webhook/webhook-route.js`, new `src/app/api/portal/route.js`, `src/app/api/checkout/checkout-route.js`, `src/app/profile/page.js` (add "Manage Billing" button only).
- B11: webhook idempotency (store processed event IDs).
- B12: Stripe Customer Portal session route + UI entry point.
- H6: fix affiliate coupon ID mismatch.

## Phase 3 — Domain & env var centralization (sonnet-builder, after Phase 1/2 land)
Files: `src/app/layout.js`, `src/app/api/auth/signup/route.js`, `src/app/api/auth/google/route.js`, `src/components/MeasureTool.js` (watermark string only), `.env.example` (new).
- B8/B9: single `NEXT_PUBLIC_APP_URL`, remove `NEXT_PUBLIC_SITE_URL`/`APP_BASE_URL`, remove hardcoded `vercel.app` fallbacks, fix watermark text.

## Phase 4 — Missing required flows (sonnet-builder)
Files: new `src/app/forgot-password/page.js`, new `src/app/reset-password/page.js`, new API routes as needed.
- B7: password reset via Supabase Auth.

## Phase 5 — Crop tool (sonnet-builder, escalate to opus-builder if canvas coordinate math with existing measurement-line system proves error-prone)
Files: `src/components/MeasureTool.js` (new crop phase), possibly new component.
- B10: minimal crop/reposition step between upload and annotate.

## Phase 6 — Legal & business pages (sonnet-builder, parallel-safe — all new files)
Files: new `src/app/terms/page.js`, `src/app/privacy/page.js`, `src/app/refund-policy/page.js`, `src/app/contact/page.js`, footer component update.
- B6.

## Phase 7 — Error pages & SEO basics (sonnet-builder, parallel-safe — all new files)
Files: new `src/app/not-found.js`, `src/app/error.js`, `public/favicon.ico`, `public/robots.txt`, `public/sitemap.xml`.
- H2, H3.

## Phase 8 — Editor bug fixes (sonnet-builder, after Phase 5 lands to avoid conflicting on MeasureTool.js)
- H4: null check in `handleExport`, `img.onerror` handlers, file-size validation, fix `toBlob` callback pattern.

## Phase 9 — Analytics events (sonnet-builder, parallel-safe)
- Funnel events per brief: signup started/completed, upload, bg-removal used/skipped, editor completed, export completed, limit reached, upgrade clicked, checkout started/completed, failures.

## Phase 10 — Testing & manual verification (me + sonnet-builder for scripted smoke checks)
- Production build, lint, manual walkthrough of full user journey, two-account RLS cross-check, Stripe test-to-furthest-safe-point.

## Phase 11 — Deployment & domain connection
- Requires manual actions (see below), then: connect domain in Vercel, set/confirm all production env vars, deploy, verify live.

---

## Manual actions required from you (cannot proceed without these)

1. **Vercel CLI auth** — the device-login flow expired. Run `vercel login` in a terminal yourself (or give me a `VERCEL_TOKEN`) so I can inspect/manage the live project and add the domain.
2. **DNS for measureapp.pro** — currently parked at your registrar, not pointed at Vercel. Once the domain is added to the Vercel project (I can do this via CLI once authenticated), you'll need to update the A/CNAME records at your registrar to Vercel's values (I'll give you the exact records once the domain is added).
3. **Confirm `AUTH_SECRET`** is actually set in Vercel's production environment (not just relying on the code fallback). If unset, generate one (`openssl rand -base64 32`) and add it in Vercel → Settings → Environment Variables.
4. **Confirm the live Stripe key in Vercel prod env** matches the one in the local `.env` (or is otherwise the correct live key) — I cannot read Vercel env values, only you can confirm this in the dashboard.
5. **Create a yearly Stripe Price** in the live Stripe Dashboard (the product already supports monthly `price_1TKme1AchI5lpRlrx1RqdVI2`), then give me the resulting `price_...` ID to set as `STRIPE_PRICE_ID_YEARLY`, or tell me to remove the yearly option from pricing if you don't want to offer it yet.
6. **Decide: admin allowlist emails** — give me the email address(es) that should be allowed to access `/admin` (yours, presumably) so I can hard-code the allowlist via an env var.
7. **Decide: email verification** — keep the current auto-confirm bypass for launch (documented limitation) or provide SMTP credentials (e.g. Resend/Postmark/SendGrid API key) so I can wire real verification. Defaulting to **keep the bypass, documented**, unless you tell me otherwise.
8. **Legal page content decisions** — company/business name and address to use in Terms/Privacy (or confirm using your name/email as sole proprietor), and refund policy terms (e.g., no refunds vs. pro-rated). I'll draft reasonable SaaS-standard defaults and flag them for your review rather than blocking on this.

I will proceed with everything else in parallel while these are pending.
