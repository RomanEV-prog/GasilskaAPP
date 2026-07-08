-- Migracija: aktivacijske kode za registracijo društev. Idempotentna.
CREATE TABLE IF NOT EXISTS registration_codes (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                     VARCHAR(32) UNIQUE NOT NULL,
  note                     VARCHAR(255),
  used_at                  TIMESTAMPTZ,
  used_by_organization_id  UUID,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);
