-- Migracija: prijava z uporabniškim imenom (ime.priimek), e-pošta neobvezna.
-- Idempotentna — varno ponovno pognati.
SET client_encoding = 'UTF8';

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- Generiraj imena za obstoječe uporabnike: ascii(ime).ascii(priimek) + št. ob koliziji.
WITH base AS (
  SELECT id, organization_id,
         lower(regexp_replace(translate(first_name, 'čšžćđČŠŽĆĐäöüÄÖÜéèêáàâíìîóòôúùû', 'cszcdCSZCDaouAOUeeeaaaiiiooouuu'), '[^a-zA-Z0-9]', '', 'g'))
         || '.' ||
         lower(regexp_replace(translate(last_name, 'čšžćđČŠŽĆĐäöüÄÖÜéèêáàâíìîóòôúùû', 'cszcdCSZCDaouAOUeeeaaaiiiooouuu'), '[^a-zA-Z0-9]', '', 'g'))
         AS uname,
         row_number() OVER (
           PARTITION BY organization_id,
             lower(regexp_replace(translate(first_name || last_name, 'čšžćđČŠŽĆĐ', 'cszcdCSZCD'), '[^a-zA-Z0-9]', '', 'g'))
           ORDER BY created_at
         ) AS rn
  FROM users
  WHERE username IS NULL
)
UPDATE users u
SET username = b.uname || CASE WHEN b.rn > 1 THEN b.rn::text ELSE '' END
FROM base b
WHERE u.id = b.id;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_org_username_unique UNIQUE (organization_id, username);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
