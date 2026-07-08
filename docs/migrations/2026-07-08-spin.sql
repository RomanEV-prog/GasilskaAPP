-- SPIN integracija (obveščanje o intervencijah iz spin3.sos112.si).
-- Idempotentna migracija; zaženi na obstoječih bazah (lokalno + produkcija).

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS spin_obcina VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS spin_obcina_id BIGINT;

CREATE TABLE IF NOT EXISTS spin_interventions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spin_guid     VARCHAR(500) UNIQUE NOT NULL,
  spin_type     VARCHAR(255),
  obcina        VARCHAR(255),
  title         VARCHAR(500) NOT NULL,
  description   TEXT,
  link          VARCHAR(500),
  occurred_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spin_obcina ON spin_interventions(obcina);
CREATE INDEX IF NOT EXISTS idx_spin_occurred ON spin_interventions(occurred_at DESC);
