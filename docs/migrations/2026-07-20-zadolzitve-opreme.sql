-- Zadolžitve opreme + NFC oznake (20. 7. 2026, predlogi Darjan/PGD Pekre):
--   1. equipment_assignments — kdo je kdaj zadolžil in vrnil kos opreme
--   2. equipment.nfc_uid      — strojni UID NFC oznake (NTAG213, 13,56 MHz)
--   3. equipment.purchase_date — datum nabave, podlaga za starost opreme
--
-- Idempotentno — varno za večkratni zagon.
--   psql -U postgres -d gasilapp -f 2026-07-20-zadolzitve-opreme.sql

CREATE TABLE IF NOT EXISTS equipment_assignments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id         UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at          TIMESTAMPTZ,
  -- SET NULL popravljen naknadno v 2026-07-20b (glej razlog tam).
  issued_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  returned_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  condition_at_issue   equipment_condition,
  condition_at_return  equipment_condition,
  issue_notes          TEXT,
  return_notes         TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eq_assign_equipment
  ON equipment_assignments(equipment_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_eq_assign_user
  ON equipment_assignments(user_id, returned_at);

-- Invarianta: en kos opreme = največ ena odprta zadolžitev.
-- Namerno v bazi, ne v aplikaciji — dva hkratna klika na "Zadolži" bi sicer
-- ustvarila dve odprti vrstici; tu drugi vpis pade na 23505.
CREATE UNIQUE INDEX IF NOT EXISTS idx_eq_assign_open
  ON equipment_assignments(equipment_id) WHERE returned_at IS NULL;

-- CREATE TRIGGER nima IF NOT EXISTS pred PG 14 → najprej DROP.
DROP TRIGGER IF EXISTS t_equipment_assignments ON equipment_assignments;
CREATE TRIGGER t_equipment_assignments BEFORE UPDATE ON equipment_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS nfc_uid VARCHAR(32);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS purchase_date DATE;

-- Delni unikatni indeks namesto UNIQUE na stolpcu (ADD COLUMN ... UNIQUE
-- ni idempotenten); več kosov brez oznake mora biti dovoljenih.
CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_nfc_uid
  ON equipment(nfc_uid) WHERE nfc_uid IS NOT NULL;
