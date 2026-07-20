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
├── docs/
│   ├── ARCHITECTURE.md        ← arhitektura sistema
│   ├── DATABASE.md            ← shema baze podatkov
│   ├── API.md                 ← vsi API endpointi
│   ├── MODULES.md             ← opis vsakega modula
│   └── DECISIONS.md           ← arhitekturne odločitve (ADR)
├── backend/                   ← NestJS API
│   └── BACKEND.md             ← navodila za backend
├── frontend/                  ← React web portal
│   └── FRONTEND.md            ← navodila za frontend
├── mobile/                    ← Flutter mobilna app
│   └── MOBILE.md              ← navodila za mobilno
└── infra/
    └── INFRA.md               ← docker, env, deployment
```

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
7. **Nikoli ne vrni `passwordHash` ali `fcmToken`** v API odgovorih
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

## Začni tukaj (vrstni red razvoja)

### Faza 1 — Backend foundation
1. `backend/` — NestJS projekt setup
2. PostgreSQL schema (`docs/DATABASE.md`)
3. Auth modul (login, register, JWT)
4. Users modul (CRUD + razpoložljivost)
5. Events modul (CRUD + RSVP + prisotnost)
6. Vehicles modul (CRUD + opomniki)
7. Trainings modul (CRUD + opomniki)
8. Notifications modul (FCM + interna)
9. Dashboard modul (agregati za vodstvo + član)

### Faza 2 — Web portal
1. `frontend/` — React + Vite setup
2. Auth (login, profile)
3. Dashboard
4. Člani (seznam, profil, dodaj)
5. Dogodki (koledar, ustvari, RSVP)
6. Vozila
7. Usposabljanja
8. Obvestila

### Faza 3 — Mobilna app
1. `mobile/` — Flutter setup
2. Auth
3. Dashboard
4. Dogodki + RSVP
5. Razpoložljivost
6. Push obvestila

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
- **Seed:** `cd backend && npm run seed` → ustvari test društvo + admina.
- **Test računi:** `admin@pgd-pekre.si` / `GasilApp123!` (org_admin) · `janez@pgd-pekre.si` / `Geslo1234` (member). **Prijava zdaj z uporabniškim imenom** (`admin.pekre`, `janez.novak` + organizationId) ali e-pošto; javni seznam društev: `GET /auth/organizations`.
- **Zagon:** backend `npm run start:dev` (port 4000), frontend `npm run dev` (port 3000).
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
