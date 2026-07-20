# Plamen — Infrastruktura

## Docker Compose za lokalni razvoj

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: gasilapp-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: gasilapp
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docs/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql

  backend:
    build: ./backend
    container_name: gasilapp-api
    ports:
      - "4000:4000"
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASS: postgres
      DB_NAME: gasilapp
      JWT_SECRET: dev_secret_change_in_production
      PORT: 4000
      NODE_ENV: development
    depends_on:
      - db
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build: ./frontend
    container_name: gasilapp-web
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:4000/api/v1
    depends_on:
      - backend

volumes:
  pgdata:
```

## Hitri start (brez Dockerja)

```bash
# 1. Zaženi PostgreSQL
docker run --name gasilapp-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=gasilapp \
  -p 5432:5432 -d postgres:15

# 2. Uvozi shemo
psql -h localhost -U postgres -d gasilapp < docs/schema.sql

# 3. Backend
cd backend && cp .env.example .env && npm install && npm run start:dev

# 4. Frontend (novo okno)
cd frontend && npm install && npm run dev
```

## ENV spremenljivke — celoten seznam

```env
# ─── DATABASE ─────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=gasilapp

# ─── JWT ──────────────────────────────────
JWT_SECRET=ZAMENJAJ_Z_64_CHAR_RANDOM_STRINGOM
JWT_EXPIRES_IN=7d

# ─── APP ──────────────────────────────────
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# ─── FIREBASE ─────────────────────────────
FIREBASE_PROJECT_ID=gasilapp-xxxxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXX\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@gasilapp.iam.gserviceaccount.com

# ─── FILE STORAGE ─────────────────────────
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
```

## Produkcijski deployment (priporočeno za MVP)

```
Railway.app ali Render.com:
- Backend: Node.js servis
- Database: PostgreSQL plugin
- Frontend: Static site
```

```bash
# Railway CLI
railway login
railway init
railway add postgresql
railway deploy
```
