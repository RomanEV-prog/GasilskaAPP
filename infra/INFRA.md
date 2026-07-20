# Plamen — Infrastruktura

Razmejitev: ta datoteka je o **razvojnem okolju in ENV spremenljivkah**.
Produkcijska namestitev je v `infra/DEPLOY.md`, postopek objave v
`/gasilapp-deploy`.

## Razvojno okolje

`docker-compose.yml` zažene **samo bazo**. Backend in frontend tečeta
neposredno prek npm — tako je hot-reload takojšen in ni treba graditi slik.

```bash
# 1. Baza (shema se ustvari iz docs/schema.sql prek initdb ob prvem zagonu)
docker compose up -d db

# 2. Backend → http://localhost:4000  (Swagger: /api/docs)
cd backend && cp .env.example .env && npm install && npm run start:dev

# 3. Frontend → http://localhost:3000  (novo okno)
cd frontend && npm install && npm run dev

# 4. Testni podatki: društvo + admin (član se NE ustvari)
cd backend && npm run seed
```

Vsebnik baze se v razvoju imenuje **`gasilapp-db`**, na produkciji
**`gasilapp-db-1`**. Ukazi niso prenosljivi med okoljema — preveri z
`docker ps --format "{{.Names}}"`.

Popolno čiščenje (izgubiš podatke, shema se ustvari na novo):
`docker compose down -v && docker compose up -d db`

## ENV spremenljivke

### Backend (`backend/.env`, predloga `.env.example`)

```env
# ─── BAZA ─────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=gasilapp
DB_SYNCHRONIZE=true     # razvoj: true · PRODUKCIJA: false (shema ročno prek migracij!)
DB_LOGGING=false

# ─── JWT ──────────────────────────────────
JWT_SECRET=ZAMENJAJ_Z_64_CHAR_RANDOM_STRINGOM
JWT_REFRESH_SECRET=ZAMENJAJ_Z_DRUGIM_RANDOM_STRINGOM
JWT_EXPIRES_IN=7d       # doba tokena (auth.module.ts, privzeto 7d)
JWT_ACCESS_EXPIRES=1h   # access token (auth.service.ts, privzeto 1h)
JWT_REFRESH_EXPIRES=30d

# ─── APLIKACIJA ───────────────────────────
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
REGISTRATION_KEY=<master ključ za izdajo aktivacijskih kod>   # DEPLOY.md §9

# ─── FIREBASE (push obvestila) ────────────
FIREBASE_PROJECT_ID=gasilapp
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@gasilapp.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXX\n-----END PRIVATE KEY-----\n"

# ─── SPIN (samo produkcija) ───────────────
SPIN_BASE_URL=http://<IP_SI_RELAYA>   # brez tega prod ne doseže feeda — DEPLOY.md §10
```

`DB_SYNCHRONIZE=false` na produkciji pomeni, da se shema **ne ustvari sama** —
vsaka sprememba zahteva migracijo iz `docs/migrations/`. Glej `/gasilapp-shema`.

> `UPLOAD_DIR` in `MAX_FILE_SIZE_MB` sta bila tu prej navedena, a ju koda
> **ne bere** (`backend/src`: 0 zadetkov). Nalaganje datotek uporablja
> privzete vrednosti Multerja.

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:4000/api/v1
```

Firebase web konfiguracija (`VITE_FIREBASE_*`) je v `frontend/.env.production`
in **ni skrivnost** — vgradi se v brskalnikov bundle. Glej `docs/FIREBASE.md`.

### Produkcija (`.env.prod` na strežniku, NIKOLI v git)

Dejansko uporabljeni ključi: `DOMAIN`, `DB_PASS`, `JWT_SECRET`,
`JWT_REFRESH_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
`FIREBASE_PRIVATE_KEY`, `REGISTRATION_KEY`, `SPIN_BASE_URL`.

## Produkcijska namestitev

Teče na **Hetzner CX22** (`178.104.67.229`, Ubuntu 24.04) v Dockerju, za
**zunanjim `eversum-caddy-1`**, ki terminira TLS. Postavitev od nič:
`infra/DEPLOY.md`. Objava nove različice: `/gasilapp-deploy`.

```bash
# Rebuild MORA vključiti override, sicer web trči na zasedenem portu 80
docker compose -f docker-compose.prod.yml -f infra/compose.behind-proxy.yml \
  --env-file .env.prod up -d --build
```

Vsebniki: `gasilapp-web` (brez `-1`), `gasilapp-backend-1`, `gasilapp-db-1`.
