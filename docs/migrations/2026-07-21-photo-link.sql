-- Poglavje »Naloži fotografije« (21. 7. 2026, feedback Darjan).
--
-- Admin društva shrani ENO zunanjo povezavo (npr. skupni Google Foto /
-- OneDrive album); člani jo v aplikaciji odprejo v brskalniku in tam gledajo
-- ter nalagajo slike. Slik NE hranimo v našem sistemu — samo povezavo.
--
-- Idempotentno — varno za večkratni zagon.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS photo_upload_link VARCHAR(500);
