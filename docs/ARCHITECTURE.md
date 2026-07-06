# GasilApp — Arhitektura sistema

## Pregled

```
┌─────────────────────────────────────────────────────────┐
│                    GASILAPP PLATFORMA                   │
├──────────────────────┬──────────────────────────────────┤
│   Web Portal         │   Mobilna App                    │
│   React + TypeScript │   Flutter (iOS + Android)        │
│   Port 3000          │                                  │
└──────────┬───────────┴──────────────────┬───────────────┘
           │  HTTPS / REST API             │
           ▼                              ▼
┌──────────────────────────────────────────────────────────┐
│              NestJS API  (Port 4000)                     │
│                                                          │
│  ┌──────────┐ ┌────────┐ ┌────────┐ ┌───────────────┐  │
│  │   Auth   │ │ Users  │ │Events  │ │  Vehicles     │  │
│  └──────────┘ └────────┘ └────────┘ └───────────────┘  │
│  ┌──────────┐ ┌────────┐ ┌────────┐ ┌───────────────┐  │
│  │Trainings │ │  Docs  │ │ Notif. │ │   Dashboard   │  │
│  └──────────┘ └────────┘ └────────┘ └───────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Common (Guards, Filters, ...)        │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌─────────────┐  ┌──────────────┐
    │ PostgreSQL │  │  Firebase   │  │  File Storage│
    │ (podatki) │  │    (FCM)    │  │  (lokalno/S3)│
    └────────────┘  └─────────────┘  └──────────────┘
```

---

## Multi-Tenant arhitektura

Vsako gasilsko društvo je **tenant** z lastnim `organization_id`.

```
┌─────────────────────────────────────────────────────┐
│                  SHARED DATABASE                    │
│                                                     │
│  ┌──────────────────┐   ┌──────────────────┐        │
│  │  PGD Pekre       │   │  PGD Maribor     │        │
│  │  org_id: aaa-111 │   │  org_id: bbb-222 │        │
│  │  ├─ users        │   │  ├─ users        │        │
│  │  ├─ events       │   │  ├─ events       │        │
│  │  ├─ vehicles     │   │  ├─ vehicles     │        │
│  │  └─ ...          │   │  └─ ...          │        │
│  └──────────────────┘   └──────────────────┘        │
└─────────────────────────────────────────────────────┘
```

**Pravilo:** Vsak service method **mora** sprejeti `organizationId` in ga vključiti v WHERE clause.

---

## API Response format

Vse uspešne response imajo obliko:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Vse napake:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Napaka...",
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/v1/users"
}
```

---

## Avtentikacija

```
1. User pošlje POST /api/v1/auth/login { email, password }
2. Server vrne { accessToken, user }
3. Vsak naslednji request: Authorization: Bearer <token>
4. JWT payload: { sub, email, orgId, roles }
5. JwtStrategy validira token in nastavi req.user
6. RolesGuard preveri vloge
```

---

## Request lifecycle

```
Request
  → JwtAuthGuard (preveri token)
  → RolesGuard (preveri vloge)
  → ValidationPipe (validira DTO)
  → Controller
  → Service (business logika + org isolation)
  → Repository (TypeORM)
  → PostgreSQL
  → TransformInterceptor (wraps response)
  → Response
```

---

## Struktura NestJS modula (vzorec)

```
modules/users/
├── user.entity.ts          ← TypeORM entiteta
├── user-role.entity.ts     ← povezana entiteta
├── users.service.ts        ← business logika
├── users.controller.ts     ← HTTP endpointi
├── users.module.ts         ← NestJS modul
└── dto/
    └── user.dto.ts         ← CreateDto, UpdateDto, FilterDto
```

**Vsakič ko delaš nov modul, sledi tej strukturi.**

---

## Varnost

- **JWT** secret v `.env` (ne v kodi)
- **bcrypt** rounds: 12 za hash gesel
- **CORS** samo za whitelisted domene
- **ValidationPipe** whitelist + forbidNonWhitelisted
- **organizationId** vedno iz JWT (ne iz URL/body)
- **Audit log** za vse destructive akcije
