# MEASURE — Production Checklist

Check items off only after direct verification (code review, real command output, or live browser test). Status will be updated as work lands.

## Security
- [ ] `AUTH_SECRET` set in Vercel production env; code throws if missing rather than using fallback
- [ ] `/admin` + admin APIs require an allowlisted admin session
- [ ] `subscribers` and `user_referrals` tables have RLS policies
- [ ] Free daily export limit enforced server-side (DB-backed), not just localStorage
- [ ] Stripe webhook signature verified (already true) + idempotent processing
- [ ] No secret keys anywhere in client-side bundles (`NEXT_PUBLIC_*` audit)
- [ ] `.env` confirmed never committed to git (verified — clean)
- [ ] Two-test-user RLS cross-access check performed manually

## Domain
- [ ] `measureapp.pro` added to Vercel project
- [ ] DNS records updated at registrar, pointing to Vercel
- [ ] HTTPS active and valid on `measureapp.pro`
- [ ] `www.measureapp.pro` redirects to apex
- [ ] Single `NEXT_PUBLIC_APP_URL=https://measureapp.pro` env var used everywhere (Supabase redirects, Stripe URLs, metadata, watermark)
- [ ] No remaining hardcoded `vercel.app`/`localhost` references in production code paths

## Auth
- [ ] Signup works
- [ ] Login works
- [ ] Logout works
- [ ] Google OAuth works end-to-end on production domain
- [ ] Password reset flow exists and works
- [ ] Email verification behavior documented (bypass or real, per decision)

## Editor / Core Workflow
- [ ] Upload works (common formats, size validation)
- [ ] Background removal (Gemini ghost-mannequin) works or fails gracefully
- [ ] Skip background removal works
- [ ] Crop/reposition step exists and works
- [ ] Add/move/edit/delete measurement lines works
- [ ] Line colors, labels, values work
- [ ] Item name + notes work
- [ ] Legend renders correctly in export
- [ ] Export produces correct, non-blank PNG
- [ ] Free-tier watermark shows correct domain; Pro export has no free watermark

## Free/Pro Business Rules
- [ ] 3 exports/day free limit enforced server-side
- [ ] Limit-reached message + upgrade prompt shown
- [ ] Pro grants correct expanded/unlimited access
- [ ] Pro access persists across logout/login and devices
- [ ] Pro status only ever driven by DB (`is_pro`), never trusted from URL/client state

## Stripe
- [ ] Live-mode monthly price working end-to-end
- [ ] Yearly price configured and working (or removed from UI if not offered)
- [ ] Checkout success/cancel URLs point to `measureapp.pro`
- [ ] Webhook endpoint registered in Stripe pointing at production domain
- [ ] Webhook idempotent
- [ ] Customer Portal accessible from account page, return URL correct
- [ ] Cancellation flow works and reflects correctly in the app

## Legal / Business Pages
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Refund/Cancellation Policy
- [ ] Contact/Support page
- [ ] Footer links to all of the above from every page

## Error Handling / SEO
- [ ] Custom 404 page
- [ ] Custom error boundary page
- [ ] Favicon + app icons present
- [ ] robots.txt present with intentional indexing directive
- [ ] sitemap.xml present
- [ ] Open Graph / Twitter card metadata correct for `measureapp.pro`

## Analytics / Monitoring
- [ ] Key funnel events tracked (signup, upload, bg-removal, export, limit reached, upgrade clicked, checkout completed)
- [ ] No sensitive image/measurement content logged in analytics

## Testing
- [ ] `next build` succeeds
- [ ] Lint passes
- [ ] Manual full user journey walkthrough on production domain (desktop)
- [ ] Manual full user journey walkthrough on production domain (mobile)
- [ ] Browser console checked for errors on key pages
- [ ] Server logs checked for errors during test walkthrough

## Deployment
- [ ] All required env vars confirmed set in Vercel production
- [ ] Production build deployed
- [ ] Live production URL manually verified post-deploy
