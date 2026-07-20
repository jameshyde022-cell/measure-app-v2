-- 007_subscribers_user_referrals_rls.sql
-- Enable RLS on subscribers and user_referrals.
--
-- Both tables were created in 005_referral_system.sql with no RLS policies. All
-- server-side API routes use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
-- automatically, so no existing operations are affected.
--
-- These tables hold billing/subscription state (subscribers) and referral-earnings
-- state (user_referrals) that must NEVER be directly writable by a client. Only
-- SELECT policies (scoped to the requesting user's JWT email claim) are added here —
-- mirroring the pattern in 006_exported_images_rls.sql. No insert/update/delete
-- policy is added for anon/authenticated, so all writes continue to flow only
-- through the service role.

-- ── subscribers ───────────────────────────────────────────────────────────────
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscribers_select_own" ON subscribers;

CREATE POLICY "subscribers_select_own"
  ON subscribers FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- ── user_referrals ────────────────────────────────────────────────────────────
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_referrals_select_own" ON user_referrals;

CREATE POLICY "user_referrals_select_own"
  ON user_referrals FOR SELECT
  TO authenticated
  USING (
    referrer_email = (auth.jwt() ->> 'email')
    OR referred_email = (auth.jwt() ->> 'email')
  );

-- ── Verification ──────────────────────────────────────────────────────────────
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE tablename IN ('subscribers', 'user_referrals');
-- → rowsecurity should be TRUE for both
--
-- SELECT policyname, cmd, roles FROM pg_policies
--   WHERE tablename IN ('subscribers', 'user_referrals');
-- → should show the two SELECT policies above and no others
