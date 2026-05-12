-- 005_referral_system.sql
-- Adds referral system, user referrals table, marketing consent, and profile fields.

-- ── subscribers: new columns ──────────────────────────────────────────────────
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS referral_code            TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by              TEXT,
  ADD COLUMN IF NOT EXISTS referral_count           INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_referral_count      INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_reward_applied  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pro_trial_expires_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id       TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id   TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle            TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_marketing_consent  BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at               TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_login_at            TIMESTAMPTZ;

-- ── user_referrals table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_email    TEXT NOT NULL,
  referred_email    TEXT NOT NULL,
  signed_up_at      TIMESTAMPTZ DEFAULT NOW(),
  converted_to_paid BOOLEAN DEFAULT false,
  converted_at      TIMESTAMPTZ
);

-- ── referral code generator ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_user_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code    TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := 'MEAS-' || upper(
        substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6)
      );
      SELECT EXISTS(
        SELECT 1 FROM subscribers WHERE referral_code = new_code
      ) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_referral_code ON subscribers;
CREATE TRIGGER trg_set_referral_code
  BEFORE INSERT ON subscribers
  FOR EACH ROW EXECUTE FUNCTION generate_user_referral_code();

-- ── backfill codes for existing rows ─────────────────────────────────────────
DO $$
DECLARE
  r          RECORD;
  new_code   TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR r IN SELECT email FROM subscribers WHERE referral_code IS NULL LOOP
    LOOP
      new_code := 'MEAS-' || upper(
        substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6)
      );
      SELECT EXISTS(
        SELECT 1 FROM subscribers WHERE referral_code = new_code
      ) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE subscribers SET referral_code = new_code WHERE email = r.email;
  END LOOP;
END;
$$;

-- ── RPCs ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_user_referral_count(p_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE subscribers SET referral_count = referral_count + 1 WHERE email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_paid_referral_count(p_email TEXT)
RETURNS VOID AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE subscribers
    SET paid_referral_count = paid_referral_count + 1
    WHERE email = p_email
    RETURNING paid_referral_count INTO new_count;

  IF new_count >= 5 THEN
    UPDATE subscribers
      SET is_pro = true, referral_reward_applied = true
      WHERE email = p_email AND referral_reward_applied = false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── marketing list view ───────────────────────────────────────────────────────
CREATE OR REPLACE VIEW marketing_list AS
SELECT
  email,
  CASE WHEN is_pro THEN 'Pro' ELSE 'Free' END AS plan,
  created_at,
  last_login_at
FROM subscribers
WHERE email_marketing_consent IS NOT false;
