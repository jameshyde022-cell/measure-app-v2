-- ============================================================
-- 002_fix_rls.sql
-- Run this in the Supabase SQL Editor to fix RLS and storage
-- ============================================================

-- ── 1. Table: disable RLS on exported_images ─────────────────────────────────
-- This table is only ever accessed from server-side API routes using the
-- service role key or anon key. There is no client-side direct access.
-- Disabling RLS is the simplest correct solution.
ALTER TABLE exported_images DISABLE ROW LEVEL SECURITY;

-- Drop any existing restrictive policies that may have been auto-created
DROP POLICY IF EXISTS "Enable read access for all users" ON exported_images;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON exported_images;
DROP POLICY IF EXISTS "Enable update for users based on email" ON exported_images;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON exported_images;

-- ── 2. Table: grant permissions to all roles ─────────────────────────────────
-- Required when using the anon key (does not bypass permission grants).
GRANT ALL ON TABLE exported_images TO anon;
GRANT ALL ON TABLE exported_images TO authenticated;
GRANT ALL ON TABLE exported_images TO service_role;

-- Grant sequence usage in case uuid_generate_v4() needs it
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ── 3. Storage: create/configure the exported-images bucket ──────────────────
-- Insert the bucket if it does not exist, or make it public if it does.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exported-images',
  'exported-images',
  true,         -- public: images are served via a public URL
  10485760,     -- 10 MB max per file
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'text/plain']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 10485760;

-- ── 4. Storage RLS: drop old policies if any exist ───────────────────────────
DROP POLICY IF EXISTS "exported_images_bucket_all"         ON storage.objects;
DROP POLICY IF EXISTS "allow_all_exported_images_storage"  ON storage.objects;
DROP POLICY IF EXISTS "allow_storage_inserts"              ON storage.objects;
DROP POLICY IF EXISTS "allow_storage_selects"              ON storage.objects;
DROP POLICY IF EXISTS "allow_storage_updates"              ON storage.objects;
DROP POLICY IF EXISTS "allow_storage_deletes"              ON storage.objects;
DROP POLICY IF EXISTS "allow_uploads"                      ON storage.objects;
DROP POLICY IF EXISTS "allow_reads"                        ON storage.objects;

-- ── 5. Storage RLS: add permissive policies for the bucket ───────────────────
-- Allow anyone to read objects in this bucket (needed for public image URLs)
CREATE POLICY "exported_images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'exported-images');

-- Allow anon and authenticated roles to insert (upload) objects
CREATE POLICY "exported_images_insert"
ON storage.objects FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (bucket_id = 'exported-images');

-- Allow anon and authenticated roles to update (upsert) objects
CREATE POLICY "exported_images_update"
ON storage.objects FOR UPDATE
TO anon, authenticated, service_role
USING (bucket_id = 'exported-images');

-- Allow anon and authenticated roles to delete objects
CREATE POLICY "exported_images_delete"
ON storage.objects FOR DELETE
TO anon, authenticated, service_role
USING (bucket_id = 'exported-images');

-- ── Verification queries ──────────────────────────────────────────────────────
-- Run these to confirm everything looks right:
--
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'exported_images';
-- → rowsecurity should be FALSE
--
-- SELECT id, name, public FROM storage.buckets WHERE id = 'exported-images';
-- → should show one row with public = true
--
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
-- → should show the four policies above
