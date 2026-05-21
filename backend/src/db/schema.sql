-- ============================================================
-- Cactus Intelligence — PostgreSQL Schema
-- Run on AWS RDS (PostgreSQL 15+)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users & Roles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  name          TEXT,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'analyst'
                            CHECK (role IN ('admin', 'analyst', 'viewer')),
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  invited_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Analyses ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analyses (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name      TEXT        NOT NULL,
  company_slug      TEXT        NOT NULL,
  company_profile   JSONB,
  competitors       JSONB,
  org_charts        JSONB,
  talent_insights   JSONB,
  investment_signals JSONB,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','processing','complete','error')),
  pipeline_step     INT         NOT NULL DEFAULT 0,  -- 0-5, tracks progress
  error_message     TEXT,
  created_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  last_edited_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_slug       ON analyses(company_slug);
CREATE INDEX IF NOT EXISTS idx_analyses_status     ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created_by ON analyses(created_by);

-- ── Due Diligence Checks ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS due_diligence_checks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id   UUID        NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  item_text     TEXT        NOT NULL,
  completed     BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  completed_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Team Notes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_notes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id   UUID        NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES users(id) ON DELETE SET NULL,
  content       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES users(id) ON DELETE SET NULL,
  user_email    TEXT,                               -- denormalized for retention
  action        TEXT        NOT NULL,               -- 'edit_profile' | 'run_pipeline' | etc.
  analysis_id   UUID        REFERENCES analyses(id) ON DELETE SET NULL,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_analysis  ON audit_log(analysis_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user      ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created   ON audit_log(created_at DESC);

-- ── Global Settings (admin-editable) ─────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key           TEXT        PRIMARY KEY,
  value         JSONB       NOT NULL,
  description   TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID        REFERENCES users(id) ON DELETE SET NULL
);

-- ── Trigger: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_users_updated_at     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  CREATE TRIGGER trg_analyses_updated_at  BEFORE UPDATE ON analyses  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  CREATE TRIGGER trg_notes_updated_at     BEFORE UPDATE ON team_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
