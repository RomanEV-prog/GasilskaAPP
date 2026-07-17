-- Feedback testerjev (Darjan, 17. 7. 2026):
--  1. nov tip dogodka 'operative_day' (Operativni dan)
--  2. events.target_user_ids — obvestilo samo izbranim članom
--  3. events.reminder_offsets + reminders_sent — nastavljivi opomniki pred dogodkom
-- (RBAC ločitev funkcij od pravic ne zahteva sprememb sheme.)
-- Idempotentno — varno za večkratni zagon.

ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'operative_day';

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS target_user_ids  JSONB,
  ADD COLUMN IF NOT EXISTS reminder_offsets JSONB,
  ADD COLUMN IF NOT EXISTS reminders_sent   JSONB NOT NULL DEFAULT '[]';
