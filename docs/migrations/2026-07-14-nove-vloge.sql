-- Nove funkcije/vloge društva (feedback PGD Pekre, 2026-07-14).
-- ALTER TYPE ... ADD VALUE je idempotenten z IF NOT EXISTS in teče izven
-- transakcije (psql avtocommit) — ne zaganjaj znotraj BEGIN/COMMIT.
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'deputy_commander';
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'chief_machinist';
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'toolkeeper';
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'board_member';
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'supervisory_board_member';
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'assistant_breathing_apparatus';
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'assistant_communications';
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'assistant_first_aid';
