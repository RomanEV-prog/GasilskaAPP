-- Inventura opreme vozila (mobilna: prislanjanje NFC oznak / ročno kljukanje).
-- Idempotentno — varno pognati večkrat.

CREATE TABLE IF NOT EXISTS vehicle_equipment_checks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id    UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  performed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total         INTEGER NOT NULL,
  present_ids   JSONB NOT NULL DEFAULT '[]',
  missing_ids   JSONB NOT NULL DEFAULT '[]',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vec_vehicle ON vehicle_equipment_checks(vehicle_id);

-- CREATE TRIGGER nima IF NOT EXISTS pred PG 14 → najprej DROP
DROP TRIGGER IF EXISTS t_vehicle_equipment_checks ON vehicle_equipment_checks;
CREATE TRIGGER t_vehicle_equipment_checks BEFORE UPDATE ON vehicle_equipment_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
