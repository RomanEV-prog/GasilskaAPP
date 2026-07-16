-- Feedback testerjev (Darjan, 16. 7. 2026):
--  1. users.spin_notifications — uporabnik si lahko izklopi SPIN obvestila
--  2. vehicles.vehicle_type: ENUM → VARCHAR(50) (oznake po tipizaciji GZS,
--     vključno s šumniki: GRČ-1, PŠ, PČ ...); stare vrednosti ostanejo
--  3. equipment.expiry_date — rok veljave/trajanja opreme
-- Idempotentno — varno za večkratni zagon.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS spin_notifications BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type') THEN
    ALTER TABLE vehicles
      ALTER COLUMN vehicle_type TYPE VARCHAR(50) USING vehicle_type::text;
    DROP TYPE vehicle_type;
  END IF;
END $$;

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS expiry_date DATE;
