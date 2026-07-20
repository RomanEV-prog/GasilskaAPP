# GasilApp — Claude Code Master Instructions

## Kaj je ta projekt?

SaaS platforma za prostovoljne gasilske društva v Sloveniji.
Vsako društvo je lasten **tenant** z ločenimi podatki.

**To NI aplikacija za alarmiranje** (Vulkan/GZS to pokriva).
**Je interna organizacijska platforma:** člani, dogodki, vozila, oprema, usposabljanja, obvestila.

---

## Mapa projekta

```
gasilapp/
├── CLAUDE.md                  ← si tukaj
├── .claude/commands/          ← skilli projekta (/gasilapp-deploy, /gasilapp-shema)
├── docs/
│   ├── ARCHITECTURE.md        ← arhitektura sistema
│   ├── DATABASE.md            ← shema baze podatkov
│   ├── schema.sql             ← KANONIČNI CREATE skript (nova baza prek initdb)
│   ├── migrations/            ← idempotentne delte za obstoječe baze (YYYY-MM-DD-*.sql)
│   ├── API.md                 ← vsi API endpointi
│   ├── MODULES.md             ← opis vsakega modula
│   ├── DECISIONS.md           ← arhitekturne odločitve (ADR)
│   └── FIREBASE.md            ← FCM konfiguracija
├── backend/                   ← NestJS API (13 modulov v src/modules/)
│   └── BACKEND.md             ← navodila za backend
├── frontend/                  ← React web portal
│   └── FRONTEND.md            ← navodila za frontend
├── mobile/                    ← Flutter mobilna app
│   └── MOBILE.md              ← navodila za mobilno
└── infra/
    ├── INFRA.md               ← docker, env
    ├── DEPLOY.md              ← postopek objave na prod (§9 kode, §10 SPIN relay)
    └── beta/index.html        ← stran za beta razdeljevanje APK
```

**Shemo baze spreminjaj na OBEH mestih** — `docs/schema.sql` (kanonično) in nova
datoteka v `docs/migrations/` (za obstoječe baze). Glej `/gasilapp-shema`.

---

## Tech Stack

| Plast | Tehnologija |
|---|---|
| Backend API | NestJS + TypeScript |
| Baza podatkov | PostgreSQL |
| ORM | TypeORM |
| Avtentikacija | JWT + RBAC |
| Push obvestila | Firebase Cloud Messaging |
| Web portal | React + TypeScript + Vite |
| Mobilna app | Flutter |
| File storage | Lokalno (MVP), S3 pozneje |
| Dokumentacija | Swagger (auto-generated) |

---

## Pravila, ki jih VEDNO upoštevaj

1. **Multi-tenant od prvega dne** — vsaka tabela ima `organization_id`, vsak query filtrira po njem
2. **Nikoli ne mešaj podatkov med organizacijami** — preveri `organizationId` v vsakem servisu
3. **RBAC na vsakem endpointu** — uporabi `@Roles()` dekorator
4. **DTO validacija** — vsak input validiran z `class-validator`
5. **Čista modularna koda** — en modul = en direktorij
6. **Audit log** — pomembne akcije (create/update/delete) se logirajo
7. **Nikoli ne vrni `passwordHash` ali `fcmToken`** v API odgovorih.
   Prav tako **nikoli ne vračaj celega `User`** v ugnezdenih odgovorih (imetnik
   opreme, udeleženec dogodka, prejemnik obvestila) — vedno ozka projekcija
   (`id, firstName, lastName`). Osebne podatke sočlanov (telefon, e-pošta,
   naslov, datum rojstva) vidi le `org_admin` (`MEMBER_DIRECTORY_ROLES` v
   `common/enums/roles.enum.ts`; `UsersService.publicProjection`).
   **Skrivanje v vmesniku NI varnostna meja** — podatki potujejo po API-ju.
8. **Slovenščina** za error sporočila (ker so za gasilce)
9. **Swagger** dokumentacija za vsak endpoint

---

## Vloge (SystemRole)

```
super_admin   → admin platforme (Anthropic/mi)
org_admin     → admin društva — EDINA vloga z upravljavskimi pravicami
member        → navaden član

# FUNKCIJE SO SAMO NAZIVI BREZ PRAVIC (feedback PGD Pekre, 17. 7. 2026):
# president, commander, deputy_commander, secretary, treasurer,
# youth_mentor, board_member, supervisory_board_member,
# assistant_communications, assistant_first_aid
# Admin pravice se dodelijo posebej (vloga org_admin ob članu).
# Izjema — tehnične vloge z modulskimi pravicami:
# chief_machinist (vozila+oprema), toolkeeper (oprema),
# assistant_breathing_apparatus (oprema)
# Funkcije se še vedno uporabljajo za CILJANJE obvestil
# (NotificationTarget.LEADERSHIP, opomniki) — to ni pravica.
```

Navaden `member` vidi samo:
- svoje podatke
- javne dogodke
- svoja usposabljanja
- obvestila

---

## Stanje projekta

**Vse tri faze so dokončane; produkcija teče na https://gasilapp.eu od 7. 7. 2026.**
Backend ima 13 modulov, web portal pokriva vse module, mobilna je v beta
razdeljevanju (Android 1.0.7+8). Novo delo je **nadgradnja obstoječega**, ne
postavljanje od začetka — poglej obstoječi modul kot vzorec, preden pišeš nov.

Skilli projekta (`.claude/commands/`, kliči z `/ime`):

| Skill | Kdaj |
|---|---|
| `/gasilapp-deploy` | objava na produkcijo — vrstni red, override za Caddy, verifikacija |
| `/gasilapp-shema` | nova tabela ali stolpec — migracije, indeksi, e2e izolacija |

Kaj sodi kam: **skill** = ponovljiv postopek s pastmi · **CLAUDE.md** = kar mora
vedeti vsaka seja že ob zagonu · **`docs/DECISIONS.md`** = arhitekturne odločitve
z razlogi (ADR) · **komentar v kodi** = kar velja le za tisto vrstico.

---

## ENV spremenljivke (`.env.example`)

Glej `infra/INFRA.md` za celoten seznam.

---

## Ko ne veš kaj narediti

1. Preberi `docs/MODULES.md` za opis modula
2. Preberi `docs/DATABASE.md` za shemo
3. Preberi `docs/API.md` za endpoint spec
4. Poglej obstoječe module kot vzorec (users je najboljši primer)

---

## Razvojno okolje (dev)

- **Baza:** `docker compose up -d db` (Postgres 15). Shema se ustvari iz `docs/schema.sql` prek initdb.
- **Seed:** `cd backend && npm run seed` → ustvari test društvo + **samo admina**.
- **Test računi:** `admin@pgd-pekre.si` / `GasilApp123!` (`admin.pekre`, org_admin). **Člana seed NE ustvari** — za testiranje pravic ga dodaj prek portala. V trenutni dev bazi sta `janez.novak` in `miha.kranjc`, a ju svež seed ne obnovi (po `docker compose down -v` ju ne bo). **Prijava z uporabniškim imenom** (+ organizationId) ali e-pošto; javni seznam društev: `GET /auth/organizations`.
- **Zagon:** backend `npm run start:dev` (port 4000), frontend `npm run dev` (port 3000).
- **Preverjanje pred commitom:** backend `npx tsc --noEmit -p tsconfig.json` + `npm run lint`; frontend `npx tsc --noEmit` + `npm run build`; mobile `flutter analyze`. Frontend nima ne lint ne test skripte — `build` je edino sito.
- **Okolje:** Git Bash + PowerShell. `$TMPDIR` NI nastavljen — za log datoteke uporabi absolutno pot.
- **Ustavi backend proces:** PowerShell `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*dist*main*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }` (vrne exit 255 tudi ob uspehu — kozmetično).
- **Šumniki v testnih podatkih:** curl iz Git Bash na Windows **pomangla šumnike/emoji** v inline argumentih (v bazo se zapiše U+FFFD `�`) — testne vnose s šumniki delaj prek portala/app ali z JSON telesom iz UTF-8 datoteke (`curl -d @telo.json`), nikoli inline. Popravek pokvarjenih vrstic: UTF-8 .sql datoteka + `docker cp` + `psql -f` (PowerShell, ne Git Bash — path mangling).
- **E2E testi:** `cd backend && npm run test:e2e` (Jest+supertest, svež tenant na zagon; throttler off v `NODE_ENV=test`). Ročni curl vzorec še velja, a **prijava je rate-limitana 5/min (429)** — za ponavljajoče teste rabi `test:e2e`. Vsak modul preveri tudi multi-tenant izolacijo (prijava kot drug tenant → 404 / 0 rezultatov).
- **Flutter (mobile):** pot vsebuje ne-ASCII znake → Android build odpove. Gradi/zaženi prek ASCII junction-a (`New-Item -ItemType Junction C:\gasilapp_mobile -Target <mobile>`). **`flutter run`/build MORA iz PowerShell iz `C:\gasilapp_mobile`** — iz Git Bash odpove (`aapt: Illegal byte sequence`), ker Git Bash razreši junction nazaj na šumnično pot. `flutter analyze`/`test` delujeta neposredno (tudi iz Git Bash). `mobile_scanner` v7 rabi `minSdk 23`+`compileSdk 36` (že v `build.gradle.kts`). Bazni URL prek `10.0.2.2` (emulator). **Dart-define je `API_URL` (NE `API_BASE_URL`!)** — release: `flutter build appbundle --release --dart-define=API_URL=https://gasilapp.eu/api/v1`. Glej `mobile/MOBILE.md`.
- **SPIN integracija:** modul `backend/src/modules/spin` bere javni feed spin3.sos112.si (intervencije po občinah). Društvo izbere **več občin** (`organizations.spin_obcine` jsonb; nastavitev v webu Nastavitve→Društvo). **SPIN geo-omejuje na SI IP → prod (Hetzner DE) ga NE doseže.** Prod uporablja SI relay (Neoserv VPS `152.89.232.161`, nginx) prek env `SPIN_BASE_URL`; mobilni zavihek SPIN bere feed neposredno s telefona. Seznam občin je vgrajen statično (`spin/obcine.data.ts`). Glej `infra/DEPLOY.md §10` + `docs/MODULES.md §9a`.
- **Beta razdeljevanje (Android):** podpisan APK na `gasilapp.eu/beta` (Caddy `handle_path /beta` iz host `/opt/gasilapp/downloads/`; stran `infra/beta/index.html`). Nov build: PowerShell iz `C:\gasilapp_mobile`, `flutter build apk --release --dart-define=API_URL=https://gasilapp.eu/api/v1`, nato `scp build/app/outputs/flutter-apk/app-release.apk root@178.104.67.229:/opt/gasilapp/downloads/gasilapp.apk`. Registracijske kode: `infra/DEPLOY.md §9`.
- **SSH na strežnike (Windows):** ni `sshpass`/`plink`; za geslo-prijavo uporabi `python` + `paramiko` (`pip install paramiko`). Hetzner + SI relay imata dodan ključ `~/.ssh/id_ed25519` (`ssh root@<IP>` deluje brez gesla).
- **NFC (oprema):** `nfc_manager` v4 (API se od v3 **prelomno** razlikuje — beri README nameščene verzije, ne piši po spominu). UID se bere prek `NfcTagAndroid.from(tag)?.id` (Android) oz. `MiFareIos.from(tag)?.identifier` (iOS); ovito v `mobile/lib/services/nfc_service.dart`. Na Androidu NFC seja teče vzporedno s kamero, na iOS jo prekrije sistemsko okno → tam ročni gumb. `equipment.nfc_uid` je **globalno** unikaten (ena fizična nalepka na svetu) — testi zato ne smejo uporabljati fiksnih UID-jev, ker razvojna baza ostane med zagoni.
- **TypeORM in unije z `null`:** `@Column()` nad poljem tipa `string | null` odpove z `DataTypeNotSupportedError: Data type "Object"` — tip stolpca je treba navesti eksplicitno (`type: 'varchar'`).
- **Git:** repo na `github.com/RomanEV-prog/GasilskaAPP` (branch `master`). CI (`.github/workflows/ci.yml`) poganja backend E2E + frontend build + `flutter analyze` ob push.
