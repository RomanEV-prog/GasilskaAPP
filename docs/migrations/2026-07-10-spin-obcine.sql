-- SPIN: prehod z enojne občine (spin_obcina) na seznam občin (spin_obcine).
-- Društvo lahko izbere več občin (svojo + sosednje, s katerimi sodeluje).
-- Idempotentna migracija; zaženi na obstoječih bazah (lokalno + produkcija).

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS spin_obcine JSONB;

-- Prenesi obstoječo enojno občino v seznam (če je nastavljena, seznam pa še prazen).
UPDATE organizations
   SET spin_obcine = jsonb_build_array(spin_obcina)
 WHERE spin_obcina IS NOT NULL
   AND spin_obcina <> ''
   AND spin_obcine IS NULL;

-- spin_obcina / spin_obcina_id ostajata (zastarela) zaradi združljivosti; ne uporabljata se več.
