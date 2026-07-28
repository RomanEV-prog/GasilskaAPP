-- Migracija: paket naročnine + evidenca izdanih računov. Idempotentna.
--
-- Zakaj: rok poteka sam pove le »do kdaj«, ne pa ali je društvo plačalo,
-- koliko in po kakšnem paketu. Brez tega ni mogoče odgovoriti na
-- »kdo mi dolguje«.
--
-- Zanka: izdaš račun → društvo plača → označiš plačano → naročnina se
-- samodejno podaljša za obdobje računa.

-- Paket: 'yearly' (12 mes.), 'monthly' (1 mes.), 'pilot' (brezplačno),
-- 'unlimited' (neomejeno). NULL = ni določen.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20);

COMMENT ON COLUMN organizations.subscription_plan IS
  'yearly | monthly | pilot | unlimited; NULL = ni določen.';

CREATE TABLE IF NOT EXISTS platform_invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Zaporedna številka v obliki YYYY-NNN (npr. 2026-001).
  number              VARCHAR(20) UNIQUE NOT NULL,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  issued_at           DATE NOT NULL DEFAULT CURRENT_DATE,
  due_at              DATE NOT NULL,
  -- Obdobje naročnine, ki ga račun pokriva.
  period_from         DATE NOT NULL,
  period_to           DATE NOT NULL,
  months              INTEGER NOT NULL,
  amount              NUMERIC(10,2) NOT NULL,
  -- 0 za nezavezanca za DDV (94. člen ZDDV-1).
  vat_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
  note                VARCHAR(500),
  paid_at             DATE,
  -- Aktivacijska koda, izdana ob plačilu (če je bila).
  registration_code_id UUID,
  cancelled_at        TIMESTAMPTZ,
  created_by_user_id  UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Pregled »kdo dolguje« in kronologija izdaje.
CREATE INDEX IF NOT EXISTS idx_platform_invoices_unpaid
  ON platform_invoices (due_at) WHERE paid_at IS NULL AND cancelled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_platform_invoices_org
  ON platform_invoices (organization_id, issued_at DESC);
