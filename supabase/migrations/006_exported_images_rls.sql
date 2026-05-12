-- 006_exported_images_rls.sql
-- Enable RLS on exported_images.
--
-- All server-side API routes use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
-- automatically, so no existing operations are affected.
--
-- The policies below restrict anon/authenticated key access to only the rows
-- that belong to the requesting user (matched via JWT email claim). This blocks
-- any direct client-side or anon-key access to other users' data.

-- ── Enable RLS ────────────────────────────────────────────────────────────────
ALTER TABLE exported_images ENABLE ROW LEVEL SECURITY;

-- Drop any stale policies from earlier migrations
DROP POLICY IF EXISTS "Enable read access for all users"              ON exported_images;
DROP POLICY IF EXISTS "Enable insert for authenticated users only"     ON exported_images;
DROP POLICY IF EXISTS "Enable update for users based on email"         ON exported_images;
DROP POLICY IF EXISTS "Enable delete for users based on email"         ON exported_images;

-- ── Per-user policies (keyed on user_email = JWT email claim) ─────────────────
-- These apply to the anon and authenticated roles only.
-- service_role always bypasses RLS — no policy needed for it.

CREATE POLICY "exported_images_select_own"
  ON exported_images FOR SELECT
  TO anon, authenticated
  USING (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "exported_images_insert_own"
  ON exported_images FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "exported_images_update_own"
  ON exported_images FOR UPDATE
  TO anon, authenticated
  USING (user_email = (auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "exported_images_delete_own"
  ON exported_images FOR DELETE
  TO anon, authenticated
  USING (user_email = (auth.jwt() ->> 'email'));

-- ── Verification ──────────────────────────────────────────────────────────────
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'exported_images';
-- → rowsecurity should be TRUE
--
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'exported_images';
-- → should show the four policies above
