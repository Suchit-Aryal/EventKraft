-- ── New columns on users table ───────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kyc_status        VARCHAR(20) DEFAULT 'none',
    -- values: 'none' | 'pending' | 'approved' | 'rejected'
  ADD COLUMN IF NOT EXISTS tagline           VARCHAR(120),
  ADD COLUMN IF NOT EXISTS skills            TEXT[],
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_visible   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_phone        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS open_messaging    BOOLEAN DEFAULT true;

-- ── KYC submissions (one record per user, upserted on resubmit) ──
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID         UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  document_type       VARCHAR(30)  NOT NULL,
    -- 'national_id' | 'nagarikta' | 'passport' | 'drivers_licence'
  doc_front_url       TEXT         NOT NULL,
  doc_front_public_id TEXT,
  doc_back_url        TEXT,
  doc_back_public_id  TEXT,
  status              VARCHAR(20)  DEFAULT 'pending',
    -- 'pending' | 'approved' | 'rejected'
  rejection_reason    TEXT,
  reviewed_by         UUID         REFERENCES users(id),
  submitted_at        TIMESTAMP    DEFAULT NOW(),
  reviewed_at         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kyc_status  ON kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_user    ON kyc_submissions(user_id);

-- ── Portfolio items (worker public profiles) ─────────────────
CREATE TABLE IF NOT EXISTS portfolio_items (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         REFERENCES users(id) ON DELETE CASCADE,
  image_url   TEXT         NOT NULL,
  public_id   TEXT,
  caption     VARCHAR(200),
  sort_order  INTEGER      DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_items(user_id);
