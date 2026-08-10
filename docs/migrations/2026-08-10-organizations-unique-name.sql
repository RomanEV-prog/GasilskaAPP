-- Unikatno ime društva (neodvisno od velikosti črk).
-- Prijava brez izbire društva razrešuje račun po imenu/e-pošti; dve društvi
-- z enakim imenom bi uporabnike begali (in razdvoumljanje bi bilo nemogoče).
-- Obstoječim podvojenim imenom (stari testni najemniki) se pripne oznaka —
-- najstarejše društvo obdrži prvotno ime. Idempotentno.

UPDATE organizations o
SET name = o.name || ' (' || o.slug || ')'
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY created_at, id)
           AS rn
  FROM organizations
) d
WHERE d.id = o.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_name_lower
  ON organizations (LOWER(name));
