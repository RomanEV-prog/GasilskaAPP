-- Popravek FK v equipment_assignments (20. 7. 2026).
--
-- Napaka iz iste seje: `issued_by` in `returned_by` sta bila ustvarjena brez
-- ON DELETE pravila → privzeto NO ACTION. Posledica: člana, ki je kdaj izdal
-- ali prevzel opremo, ni bilo mogoče izbrisati iz baze, z njim pa tudi ne
-- celotnega društva (brisanje društva kaskadira na uporabnike in se ustavi ob
-- teh dveh referencah).
--
-- Aplikacije to ni lomilo, ker DELETE /users/:id samo deaktivira, a je oviralo
-- brisanje društva in čiščenje testnih podatkov.
--
-- Rešitev: ON DELETE SET NULL. Oba stolpca sta že nullable; zapis "kdo je
-- izdal" se ob izbrisu tistega člana izgubi, zapis "kdo je opremo IMEL"
-- (user_id, CASCADE) pa ostane del zgodovine.
--
-- Idempotentno — varno za večkratni zagon.

ALTER TABLE equipment_assignments
  DROP CONSTRAINT IF EXISTS equipment_assignments_issued_by_fkey;
ALTER TABLE equipment_assignments
  ADD CONSTRAINT equipment_assignments_issued_by_fkey
  FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE equipment_assignments
  DROP CONSTRAINT IF EXISTS equipment_assignments_returned_by_fkey;
ALTER TABLE equipment_assignments
  ADD CONSTRAINT equipment_assignments_returned_by_fkey
  FOREIGN KEY (returned_by) REFERENCES users(id) ON DELETE SET NULL;
