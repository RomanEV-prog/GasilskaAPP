-- Migracija: naročnine društev + veljavnost aktivacijskih kod. Idempotentna.
--
-- Aktivacijska koda odslej določa, KOLIKO ČASA društvo lahko uporablja
-- platformo (12 mesecev = letna naročnina, 2 meseca = preizkus).
-- Po poteku je dostop samo za branje (SubscriptionGuard v backendu).
--
-- Obstoječa društva namenoma dobijo NULL = neomejeno, da jim posodobitev
-- ne ugasne dostopa.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN organizations.subscription_expires_at IS
  'Do kdaj velja naročnina. NULL = neomejeno (pilotna društva).';

ALTER TABLE registration_codes
  ADD COLUMN IF NOT EXISTS valid_months        INTEGER,
  ADD COLUMN IF NOT EXISTS revoked_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS issued_by_user_id   UUID,
  ADD COLUMN IF NOT EXISTS redeemed_by_user_id UUID;

COMMENT ON COLUMN registration_codes.valid_months IS
  'Koliko mesecev dostopa odklene koda. NULL = neomejeno.';

-- Iskanje društev pred potekom (opomniki) in pregled na strani platforme.
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_expires
  ON organizations (subscription_expires_at);

-- Pregled izdanih kod v vrstnem redu izdaje.
CREATE INDEX IF NOT EXISTS idx_registration_codes_created
  ON registration_codes (created_at DESC);
