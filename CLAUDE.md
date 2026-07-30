# Plamen — Claude Code Master Instructions

## Kaj je ta projekt?

SaaS platforma za prostovoljne gasilske društva v Sloveniji.
Vsako društvo je lasten **tenant** z ločenimi podatki.

**To NI aplikacija za alarmiranje** (Vulkan/GZS to pokriva).
**Je interna organizacijska platforma:** člani, dogodki, vozila, oprema, usposabljanja, obvestila.

### Ime »Plamen« vs. identifikator `gasilapp` — NE poenoti jih

Blagovna znamka se je 20. 7. 2026 preimenovala iz »GasilApp« v **Plamen**.
Preimenovalo se je **samo, kar uporabnik vidi** (naslovi, `android:label`,
manifest PWA, prijavni zaslon, beta stran). Vse spodnje ostane `gasilapp` in
**preimenovanje bi kaj pokvarilo**:

| Ostane | Zakaj |
|---|---|
| `si.gasilapp.gasilapp_mobile` (applicationId, namespace, `MainActivity.kt`) | Play Console ga po prvi objavi ne dovoli spremeniti — nov ID = nova aplikacija |
| `pubspec.yaml` `name: gasilapp_mobile` | Dart ime paketa; sprememba zahteva popravek vsakega `import 'package:...'` |
| Firebase `projectId: 'gasilapp'`, `authDomain`, `storageBucket` | pravi Firebase projekt |
| `/opt/gasilapp`, `gasilapp-db-1`, `gasilapp-web`, ime baze | produkcija ostane |
| `gasilapp.eu` kot **delujoča** domena | od 29. 7. 2026 je primarna `plamenapp.si`, a stara MORA ostati živa — nameščene mobilne app imajo njen naslov vgrajen v build (`--dart-define=API_URL`). Ugasnjena = vsem testerjem se app ustavi na prijavi. Glej `infra/DEPLOY.md §11` |
| ključ `gasilapp.tour.v1.<userId>` (`OnboardingTour.tsx`) | v localStorage; nov ključ = uvodni vodič se znova prikaže vsem |

Ikona: `infra/brand/` hrani izvorni logotip. Ikone se generirajo iz njega —
plamen brez besedila (besedilo je pri 48 dp neberljivo, ime pa Android že
izpiše pod ikono). Android uporablja adaptive icon
(`mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_foreground` + barva
`#121519`).

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
├── backend/                   ← NestJS API (14 modulov v src/modules/)
│   └── BACKEND.md             ← navodila za backend
├── frontend/                  ← React web portal
│   └── FRONTEND.md            ← navodila za frontend
├── mobile/                    ← Flutter mobilna app
│   └── MOBILE.md              ← navodila za mobilno
└── infra/
    ├── INFRA.md               ← docker, env
    ├── DEPLOY.md              ← objava na prod (§7a kopije, §9 kode, §10 SPIN relay)
    └── beta/index.html        ← stran za beta razdeljevanje APK
```

**Shemo baze spreminjaj na OBEH mestih** — `docs/schema.sql` (kanonično) in nova
datoteka v `docs/migrations/` (za obstoječe baze). Glej `/gasilapp-shema`.

---

## Tech Stack

| Plast | Tehnologija |
|---|---|
| Backend API | NestJS 11 + TypeScript (Node 22, Docker `node:22-alpine`) |
| Baza podatkov | PostgreSQL 15 |
| ORM | TypeORM 1.x (`select` kot objekt, ne seznam!) |
| Avtentikacija | JWT + RBAC + 2FA (TOTP, lastna implementacija) |
| Push obvestila | Firebase Cloud Messaging (firebase-admin 14, modularni API) |
| E-pošta | nodemailer prek Gmail SMTP (`MAIL_*` env; brez njih no-op) |
| Web portal | React + TypeScript + Vite |
| Mobilna app | Flutter |
| File storage | Lokalno (MVP), S3 pozneje |
| Dokumentacija | Swagger (samo dev — na produkciji izklopljen) |

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
super_admin   → admin platforme (mi) — zavihek »Platforma«: aktivacijske kode
                in naročnine vseh društev. Vloge NI mogoče dodeliti prek
                aplikacije; samo `npm run super-admin -- <email>` na strežniku.
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

Navaden `member` vidi samo: svoje podatke, javne dogodke, svoja usposabljanja,
obvestila.

---

## Stanje projekta

**Vse tri faze so dokončane; produkcija teče od 7. 7. 2026 — od 29. 7. 2026 na
https://plamenapp.si (primarna) in https://gasilapp.eu (obvezno ohranjena).**
Backend ima 14 modulov, web portal pokriva vse module.

**Naročnine (od 28. 7. 2026):** aktivacijska koda ne odklene le registracije,
ampak določi tudi trajanje dostopa (`registration_codes.valid_months` →
`organizations.subscription_expires_at`; `null` = neomejeno). Po poteku
`SubscriptionGuard` vrne **402** za vsako pisanje — branje ostane. Izjeme
označi `@AllowExpired()`. Kode izdaja `super_admin` v portalu (zavihek
Platforma), društvo podaljša z `POST /organizations/me/redeem-code`.
Ista stran vodi **evidenco računov** (`platform_invoices`): izdaja s
številko `YYYY-NNN`, odprt dolg, natisljiv izpis; klik »Plačano« podaljša
naročnino. Podatki izdajatelja so v env (`INVOICE_ISSUER_*`) — račune še
vedno pošiljaš ročno; samodejno gre le e-pošta za reset gesla.
Podrobno: `docs/MODULES.md §14`, `infra/DEPLOY.md §9`.

**Mobilna (ime »Plamen«):** Google Play — interno preizkušanje, trenutna
izdaja **1.0.16 (koda 17, 30. 7. 2026)**; poleg tega beta APK na
`plamenapp.si/beta`. Trgovinska stran in izjave so poslane v Googlov pregled;
do zaključka testerji vidijo začasno ime `si.gasilapp.gasilapp_mobile
(unreviewed)` (info, ne napaka). Play IDji: developer 5046106616640158875,
app 4973541200399618968, interni track 4701224842560389717, opt-in
`https://play.google.com/apps/internaltest/4701224842560389717`.

Novo delo je **nadgradnja obstoječega**, ne postavljanje od začetka — poglej
obstoječi modul kot vzorec, preden pišeš nov (users je najboljši primer).

### Skilli projekta (`.claude/commands/`, kliči z `/ime`)

| Skill | Kdaj |
|---|---|
| `/gasilapp-deploy` | objava backend+splet na produkcijo — vrstni red, override za Caddy, verifikacija (tudi rate-limit z dveh IP-jev) |
| `/gasilapp-play-izdaja` | nova mobilna izdaja — bump, build, beta scp, Google Play interno (ID-ji + pasti) |
| `/gasilapp-shema` | nova tabela ali stolpec — migracije, indeksi, e2e izolacija |
| `/ikona-aplikacije` | zamenjava ikone — izrez motiva, adaptive icon, preverba v APK |
| `/preimenovanje-znamke` | sprememba imena — kaj zamenjati in kaj bi zlomilo sistem |
| `/mobilna-ziva-preverba` | preverba mobilne spremembe na emulatorju — adb posnetki/tapi, testni FCM push, pasti |

Kaj sodi kam: **skill** = ponovljiv postopek s pastmi · **CLAUDE.md** = kar mora
vedeti vsaka seja že ob zagonu · **`docs/DECISIONS.md`** = arhitekturne odločitve
z razlogi (ADR) · **komentar v kodi** = kar velja le za tisto vrstico.

---

## Razvojno okolje — zagon in ukazi

- **Baza:** `docker compose up -d db` (Postgres 15). Shema se ustvari iz `docs/schema.sql` prek initdb.
- **Seed:** `cd backend && npm run seed` → ustvari test društvo + **samo admina**.
- **Test računi:** `admin@pgd-pekre.si` / `GasilApp123!` (`admin.pekre`, org_admin). **Člana seed NE ustvari** — dodaj ga prek portala. V trenutni dev bazi sta `janez.novak` in `miha.kranjc`, a ju svež seed ne obnovi. POZOR: dev admin ima lahko vklopljeno 2FA (Romanov telefon) — za skriptirane teste uporabi račun brez 2FA.
- **Prijava (API):** polje je vedno `username` — vanj gre uporabniško ime (takrat obvezen `organizationId`) **ali e-pošta** (brez `organizationId`). Telesa s poljem `email` backend zavrne. Odgovori so oviti v `data` (`data.accessToken`); javni seznam društev: `GET /auth/organizations` → `data`.
- **Zagon:** backend `npm run start:dev` (port 4000), frontend `npm run dev` (port 3000 — če je zaseden, Vite vzame 3001!).
- **Pred commitom:** backend `npx tsc --noEmit -p tsconfig.json` (lint skripte ni več); frontend `npx tsc --noEmit` + `npm run build`; mobile `flutter analyze` **iz `C:\gasilapp_mobile`** (glej Mobilna spodaj).
- **Ustavi backend proces:** PowerShell `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*dist*main*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }` (vrne exit 255 tudi ob uspehu — kozmetično).
- **Git/CI:** repo `github.com/RomanEV-prog/GasilskaAPP` (branch `master`). CI: backend E2E + frontend build + Playwright dimni test + `flutter analyze` (node 22). Dependabot odpira tedenske PR-je.

## Testi

- **Backend E2E:** `cd backend && npm run test:e2e` (Jest+supertest, svež tenant na zagon; throttler off v `NODE_ENV=test`; 101 testov). Ročni curl: prijava je rate-limitana 5/min (429) — za ponavljajoče teste rabi `test:e2e`. Vsak modul preveri tudi multi-tenant izolacijo (drug tenant → 404 / 0 rezultatov).
- **Playwright dimni test:** `frontend/tests/smoke.spec.ts` (`npm run test:e2e` v frontend). Lokalno OBVEZNO `VITE_API_URL=http://localhost:4000/api/v1` pri buildu (vite sicer bere commitan `.env.production` → kliče produkcijo!) in `PW_USER`/`PW_PASS` račun brez 2FA. CI job `frontend-e2e` teče sam.

## Varnost (od 30. 7. 2026)

- **2FA (TOTP)** za web IN mobilno (od 1.0.15) — vklop v Nastavitvah; prijava vrne `requires2fa`+`pendingToken` → `/auth/2fa/verify`. TOTP je lastna implementacija (`auth/totp.util.ts`) — `otplib` v13 je ESM-only in se lomi v Jest, NE vračaj ga. Glej ADR-011.
- **`token_version`** v refresh žetonu: sprememba gesla/2FA odjavi vse naprave.
- **Rate-limit po klientovem IP zahteva DVOJE:** `TRUST_PROXY_HOPS=2` (backend env) **in** `trusted_proxies static private_ranges` v `frontend/Caddyfile` — notranji Caddy sicer prejeti `X-Forwarded-For` zavrže in backend za vse vidi eversumov IP (limit spet globalen). Pri spremembah proxy verige ponovi živ test z dveh IP-jev (`/gasilapp-deploy`).
- **Reset gesla po e-pošti deluje** (Gmail SMTP prek `MAIL_*` v `.env.prod`; brez njih no-op). `MailService` v `notifications/`. Web strani `/forgot-password` + `/reset-password`; mobilna ima dialog na prijavi.
- Helmet na backendu, varnostni headerji+CSP v `frontend/Caddyfile`, Swagger na produkciji izklopljen. Sentry pripravljen (vklopi se ob `SENTRY_DSN`/`VITE_SENTRY_DSN`).
- **Off-site kopije baze:** cron 03:30 na prod → age-šifrirano na SI relay (retencija 14 dni). Zasebni ključ SAMO pri Romanu. Obnova: `infra/DEPLOY.md §7a`.

## Mobilna (Flutter)

- **Pot vsebuje ne-ASCII znake → Android build odpove.** Gradi/zaženi prek ASCII junction-a (`New-Item -ItemType Junction C:\gasilapp_mobile -Target <mobile>`). `flutter run`/build/**analyze** MORA iz PowerShell iz `C:\gasilapp_mobile` — iz Git Bash odpove (`aapt: Illegal byte sequence`; analyze: `FormatException: Unexpected end of input`, od nadgradnje Flutterja 24. 7. 2026).
- **`minSdk` je `maxOf(flutter.minSdkVersion, 23)`, NE gol `23`** — Flutter migrator gol literal ob vsakem buildu prepiše nazaj na 21; `maxOf(...)` izraza ne dira (25. 7. 2026). `mobile_scanner` v7 rabi `minSdk 23`+`compileSdk 36`.
- **Dart-define je `API_URL` (NE `API_BASE_URL`!)**. Release: `flutter build appbundle --release --dart-define=API_URL=https://plamenapp.si/api/v1`. Emulator: `http://10.0.2.2:4000/api/v1`. Glej `mobile/MOBILE.md`.
- **Beta razdeljevanje:** podpisan APK na `plamenapp.si/beta` (Caddy `handle_path /beta` iz `/opt/gasilapp/downloads/`; stran `infra/beta/index.html`). Build iz `C:\gasilapp_mobile`, nato `scp .../app-release.apk root@178.104.67.229:/opt/gasilapp/downloads/gasilapp.apk`. Postopek: `/gasilapp-play-izdaja`.
- **NFC (oprema):** `nfc_manager` v4 (API prelomno drugačen od v3 — beri README nameščene verzije). UID: `NfcTagAndroid.from(tag)?.id` / `MiFareIos.from(tag)?.identifier`; ovito v `mobile/lib/services/nfc_service.dart`. Android: NFC ob kameri; iOS: sistemsko okno → ročni gumb. `equipment.nfc_uid` je **globalno** unikaten — testi ne smejo uporabljati fiksnih UID-jev.

## Integracije

- **SPIN:** modul `backend/src/modules/spin` bere javni feed spin3.sos112.si. Društvo izbere **več občin** (`organizations.spin_obcine` jsonb; web Nastavitve→Društvo). **SPIN geo-omejuje na SI IP → prod (Hetzner DE) ga NE doseže** — prod uporablja SI relay (Neoserv VPS `152.89.232.161`, nginx) prek env `SPIN_BASE_URL`; mobilni zavihek SPIN bere feed neposredno s telefona. Občine statično v `spin/obcine.data.ts`. Glej `infra/DEPLOY.md §10` + `docs/MODULES.md §9a`.
- **SSH na strežnike (Windows):** ni `sshpass`/`plink`; za geslo-prijavo `python` + `paramiko`. Hetzner (`178.104.67.229`) + SI relay imata ključ `~/.ssh/id_ed25519` — `ssh root@<IP>` brez gesla.

## Pasti (koda)

- **TypeORM in unije z `null`:** `@Column()` nad `string | null` odpove z `DataTypeNotSupportedError` — tip navedi eksplicitno (`type: 'varchar'`).
- **TypeORM 1.x:** `select` je objekt (`{ id: true }`), seznam (`['id']`) ne prevede več.
- **Brisljiva polja: `null`, ne `undefined`.** Vzorec `data.x || undefined` → `JSON.stringify` polje IZPUSTI → backend stare vrednosti ne prepiše → polja se ne da počistiti. Za brisljiva polja pošlji `null` (`data.x || null`); nullable stolpec + `@IsOptional()` ga počistita. Udarilo 2026-07-21 (servisni datum vozila).
- **Šumniki v testnih podatkih:** curl iz Git Bash pomangla šumnike/emoji v inline argumentih (v bazo pride `�`) — uporabi JSON telo iz UTF-8 datoteke (`curl -d @telo.json`) ali portal/app. Popravek pokvarjenih vrstic: UTF-8 .sql + `docker cp` + `psql -f` iz PowerShell.
- **Okolje:** Git Bash + PowerShell; `$TMPDIR` NI nastavljen — za log datoteke absolutna pot.

---

## ENV spremenljivke

Glej `infra/INFRA.md` za celoten seznam (baza, JWT, TRUST_PROXY_HOPS, MAIL_*,
SENTRY, Firebase, SPIN, INVOICE_*). Nova spremenljivka gre vedno v trojico:
`.env.example` + `docker-compose.prod.yml` (environment **našteva**!) +
`infra/INFRA.md`; vrednost v `.env.prod` na strežniku.

## Ko ne veš kaj narediti

1. Preberi `docs/MODULES.md` za opis modula
2. Preberi `docs/DATABASE.md` za shemo
3. Preberi `docs/API.md` za endpoint spec
4. Poglej obstoječe module kot vzorec (users je najboljši primer)
