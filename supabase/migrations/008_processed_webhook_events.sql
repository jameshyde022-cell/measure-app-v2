-- 008_processed_webhook_events.sql
-- Idempotency ledger for Stripe webhook deliveries.
--
-- The Stripe webhook handler inserts each incoming event.id into this table
-- before processing it. A primary-key conflict on insert means the event was
-- already handled (Stripe retries deliveries), so the handler can safely skip
-- re-running non-idempotent logic (e.g. referral-count increments).
--
-- This table is only ever touched by the service-role key server-side, which
-- bypasses RLS. RLS is enabled with zero policies (default-deny) for defense in
-- depth, consistent with how other service-role-only tables are handled here.

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id      TEXT PRIMARY KEY,
  processed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Enable RLS (no policies → default-deny for anon/authenticated) ─────────────
-- service_role always bypasses RLS — no policy needed for it.
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- ── Verification ──────────────────────────────────────────────────────────────
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'processed_webhook_events';
-- → rowsecurity should be TRUE
--
-- SELECT policyname FROM pg_policies WHERE tablename = 'processed_webhook_events';
-- → should return zero rows
