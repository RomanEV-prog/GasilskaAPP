# GasilApp — spremembe sheme baze (entiteta, migracija, testi)

Postopek dodajanja nove tabele ali stolpca skozi vse plasti: TypeORM entiteta →
`docs/schema.sql` → migracija → e2e testi. Zgrajen iz seje 2026-07-20
(`equipment_assignments` + `equipment.nfc_uid`). Razmejitev: `/gasilapp-deploy`
je o objavi migracije na produkcijo — ta skill je o njenem **pisanju**.

## Zakaj / arhitektura

- **TypeORM migracij v tem projektu NI.** `synchronize` je privzeto izklopljen
  (`app.module.ts`: `DB_SYNCHRONIZE`), shema je ročno vzdrževana SQL.
- Shemo je treba posodobiti na **DVEH mestih**, sicer se sveža in obstoječa baza
  razideta:
  1. `docs/schema.sql` — kanonični `CREATE` skript (nova baza prek initdb)
  2. `docs/migrations/YYYY-MM-DD-<opis>.sql` — idempotentna delta (obstoječe baze)
- Posodobi tudi `docs/DATABASE.md`, `docs/API.md`, `docs/MODULES.md`, ob
  arhitekturni odločitvi še `docs/DECISIONS.md` (ADR).
- **Otroška tabela nima svojega `organization_id`** — najemništvo podeduje prek
  starša (vzorec `event_attendance`). Servis vedno najprej razreši starša prek
  tenant-scoped `findOne`, šele nato dela z otrokom.

## Konkretni recepti

### Invarianta sodi v bazo, ne v kodo
Za pravila tipa »en kos opreme = največ ena odprta zadolžitev« uporabi **delni
unikatni indeks**. Aplikacijsko preverjanje ob dveh hkratnih zahtevkih ne zdrži:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_eq_assign_open
  ON equipment_assignments(equipment_id) WHERE returned_at IS NULL;
```

V servisu ujemi še tekmo:
```ts
const PG_UNIQUE_VIOLATION = '23505';
try { return await this.repo.save(entity); }
catch (err) {
  if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION)
    throw new ConflictException('… je že zadolžena …');
  throw err;
}
```

### Idempotentna migracija — vzorec
```sql
CREATE TABLE IF NOT EXISTS <tabela> ( … );
CREATE INDEX IF NOT EXISTS idx_… ON …;

-- CREATE TRIGGER nima IF NOT EXISTS pred PG 14 → najprej DROP
DROP TRIGGER IF EXISTS t_<tabela> ON <tabela>;
CREATE TRIGGER t_<tabela> BEFORE UPDATE ON <tabela>
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE <tabela> ADD COLUMN IF NOT EXISTS <stolpec> <tip>;

-- UNIQUE kot LOČEN delni indeks: "ADD COLUMN … UNIQUE" NI idempotenten
CREATE UNIQUE INDEX IF NOT EXISTS idx_…_uid ON <tabela>(<stolpec>)
  WHERE <stolpec> IS NOT NULL;
```

Konvencije: `uuid_generate_v4()`, `TIMESTAMPTZ`, indeksi `idx_<tabela>_<stolpci>`,
`updated_at` prek sprožilca `update_updated_at()`.

### Test migracije lokalno (PowerShell, NE Git Bash — mangling poti)
```powershell
$mig = "…\docs\migrations\<datum>-<opis>.sql"
docker cp $mig gasilapp-db:/tmp/mig.sql
docker exec gasilapp-db psql -U postgres -d gasilapp -v ON_ERROR_STOP=1 -f /tmp/mig.sql
# poženi DVAKRAT — drugič mora dati same NOTICE ... skipping, brez napak
docker exec gasilapp-db psql -U postgres -d gasilapp -c "\d <tabela>"
```
Lokalni vsebnik je `gasilapp-db`, produkcijski `gasilapp-db-1`.

## E2E verifikacija

```bash
cd backend && npm run test:e2e     # poženi DVAKRAT zapored
```

Vsak nov modul naj pokrije: uspeh · konflikt (409) · manjkajoče pravice (403) ·
**multi-tenant izolacija** (drugi tenant → 404 / 0 rezultatov) · vsebina
odgovora (da ne uhajajo osebni podatki).

Obstoječa infrastruktura v `test/app.e2e-spec.ts`: `tokenA` (admin org A),
`tokenB` (admin org B), `memberToken` + `memberId` (navaden član org A), `stamp`.

## Gotchas

- **TypeORM in unija z `null`:** `@Column()` nad `string | null` odpove z
  `DataTypeNotSupportedError: Data type "Object" … is not supported`. Tip stolpca
  navedi eksplicitno:
  ```ts
  @Column({ name: 'nfc_uid', type: 'varchar', nullable: true, length: 32 })
  nfcUid?: string | null;
  ```
  Simptom je zavajajoč — pade **vseh 71 testov naenkrat** z `Cannot read
  properties of undefined (reading 'address')`, ker DataSource sploh ne vstane.

- **Globalno unikatna polja + obstojna razvojna baza = testi padejo drugič.**
  E2E baza se med zagoni NE počisti. Fiksna vrednost (`const uid = '04A2B3…'`)
  gre prvič skozi, drugič trči sama vase. Izpelji jo iz `stamp`:
  ```ts
  const uid = `04${stamp.toString(16).toUpperCase().padStart(12, '0')}`;
  ```

- **`forbidNonWhitelisted: true`** v globalnem ValidationPipe → vsako polje DTO
  mora imeti dekorator, sicer 400.

- **Vrstni red poti v kontrolerju:** statične poti (`my-assignments`, `nfc/:uid`,
  `inspections-due`) morajo biti deklarirane **PRED** `@Get(':id')` s
  `ParseUUIDPipe`, sicer jih ta prestreže in vrne 400.

- **`tsc --noEmit` po spremembi podpisa servisa je obvezen** — v tej seji je
  ujel `dashboard.service.ts`, ki je bral `me.availability` iz zožene unije. Brez
  prevoda bi to prišlo v produkcijo.

- **Preveri, kam še uhaja polna entiteta:** `grep -rn "relations: { user" backend/src`
  pred spremembo projekcije uporabnika.

- **`ON DELETE CASCADE` na `user_id`** bi ob trdem izbrisu izbrisal zgodovino.
  V GasilApp je `DELETE /users/:id` v resnici `deactivate` (mehki izbris), zato je
  varno — a to preveri, preden se zaneseš.
