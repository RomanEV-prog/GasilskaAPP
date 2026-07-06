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
org_admin     → admin društva
president     → predsednik
commander     → poveljnik
secretary     → tajnik
treasurer     → blagajnik
youth_mentor  → mentor mladine
member        → navaden član
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
- **Test računi:** `admin@pgd-pekre.si` / `GasilApp123!` (org_admin) · `janez@pgd-pekre.si` / `Geslo1234` (member).
- **Zagon:** backend `npm run start:dev` (port 4000), frontend `npm run dev` (port 3000).
- **Okolje:** Git Bash + PowerShell. `$TMPDIR` NI nastavljen — za log datoteke uporabi absolutno pot.
- **Ustavi backend proces:** PowerShell `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*dist*main*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }` (vrne exit 255 tudi ob uspehu — kozmetično).
- **E2E test vzorec:** curl proti živemu backendu; vsak modul preveri tudi multi-tenant izolacijo (prijava kot drug tenant → 404 / 0 rezultatov).
- **Flutter (mobile):** pot vsebuje ne-ASCII znake → Android build odpove (shader compiler). Gradi prek ASCII junction-a (`New-Item -ItemType Junction C:\gasilapp_mobile -Target <mobile>`). `flutter analyze`/`test` delujeta neposredno. Bazni URL prek `10.0.2.2` (emulator). Glej `mobile/MOBILE.md`.
