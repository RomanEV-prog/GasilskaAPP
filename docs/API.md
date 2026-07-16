# GasilApp — API Endpoint Specifikacija

Base URL: `http://localhost:4000/api/v1`
Swagger UI: `http://localhost:4000/api/docs`

**Vsi endpointi (razen Auth) zahtevajo:** `Authorization: Bearer <jwt_token>`

**`orgId` se VEDNO bere iz JWT** — ne iz URL-ja ali body-ja.

---

## AUTH `/auth`

| Metoda | Pot | Opis | Auth |
|--------|-----|------|------|
| POST | `/auth/login` | Prijava | ❌ |
| POST | `/auth/register` | Registracija novega društva | ❌ |
| POST | `/auth/forgot-password` | Pošlji reset link | ❌ |
| POST | `/auth/reset-password` | Nastavi novo geslo | ❌ |
| PATCH | `/auth/fcm-token` | Posodobi Firebase token | ✅ |

### POST `/auth/login`
```json
// Request
{ "email": "janez@pgd-pekre.si", "password": "GasilApp123!" }

// Response
{
  "accessToken": "eyJ...",
  "user": { "id": "uuid", "email": "...", "firstName": "Janez", "roles": ["member"] }
}
```

### POST `/auth/register`
```json
// Request
{
  "organizationName": "PGD Pekre",
  "organizationSlug": "pgd-pekre",
  "firstName": "Darjan",
  "lastName": "Štajnmc",
  "email": "darjan@pgd-pekre.si",
  "password": "GasilApp123!"
}
```

---

## USERS `/users`

| Metoda | Pot | Opis | Vloge |
|--------|-----|------|-------|
| GET | `/users` | Seznam vseh članov | vsi |
| GET | `/users/me` | Moj profil | vsi |
| GET | `/users/:id` | Profil člana | vsi |
| GET | `/users/availability` | Pregled razpoložljivosti | vsi |
| GET | `/users/available-operatives` | Dosegljivi operativci | vsi |
| POST | `/users` | Dodaj člana | admin, president, secretary |
| PATCH | `/users/me/availability` | Moja razpoložljivost | vsi |
| PATCH | `/users/me/spin-notifications` | Vklop/izklop mojih SPIN obvestil | vsi |
| PATCH | `/users/:id` | Uredi člana | admin, president, secretary |
| DELETE | `/users/:id` | Deaktiviraj člana | admin, president |

### Query params za GET `/users`
- `?membershipStatus=operative`
- `?isActive=true`

### PATCH `/users/me/availability`
```json
{ "availability": "on_leave" }
// Vrednosti: available | at_home | at_work | on_leave | sick | unavailable
```

### PATCH `/users/me/spin-notifications`
```json
{ "spinNotifications": false }
// false → uporabnik ne prejema SPIN push obvestil in jih ne vidi v seznamu obvestil
```

---

## EVENTS `/events`

| Metoda | Pot | Opis | Vloge |
|--------|-----|------|-------|
| GET | `/events` | Seznam dogodkov | vsi |
| GET | `/events/upcoming` | Prihajajoči (za dashboard) | vsi |
| GET | `/events/:id` | Podrobnosti | vsi |
| POST | `/events` | Ustvari dogodek | admin, president, commander, secretary |
| PATCH | `/events/:id` | Uredi dogodek | admin, president, commander, secretary |
| PATCH | `/events/:id/cancel` | Odpovej dogodek | admin, president, commander |
| DELETE | `/events/:id` | Izbriši dogodek (samo pretekle ali odpovedane) | admin, president, commander |
| POST | `/events/:id/rsvp` | Potrdi udeležbo | vsi |
| GET | `/events/:id/rsvps` | Poglej odzive | admin, president, commander, secretary |
| POST | `/events/:id/attendance` | Označi prisotnost | admin, commander, president |

### POST `/events`
```json
{
  "title": "Redna vaja",
  "description": "Mesečna vaja operativcev",
  "location": "Gasilski dom",
  "eventType": "drill",
  "startsAt": "2024-02-15T18:00:00Z",
  "endsAt": "2024-02-15T20:00:00Z",
  "targetGroup": ["operative"],
  "requiresRsvp": true,
  "sendNotification": true,
  "reminderMinutes": 60
}
// eventType: drill | meeting | competition | intervention | cleanup | celebration | assembly | other
```

### POST `/events/:id/rsvp`
```json
{ "status": "attending", "note": "Pridem točno ob 18h" }
// status: attending | not_attending | maybe | late
```

### POST `/events/:id/attendance`
```json
{
  "entries": [
    { "userId": "uuid-1", "present": true },
    { "userId": "uuid-2", "present": false }
  ]
}
```

---

## VEHICLES `/vehicles`

| Metoda | Pot | Opis | Vloge |
|--------|-----|------|-------|
| GET | `/vehicles` | Seznam vozil | vsi |
| GET | `/vehicles/:id` | Podrobnosti vozila | vsi |
| GET | `/vehicles/expiring` | Vozila s potekajočimi roki | admin, commander |
| POST | `/vehicles` | Dodaj vozilo | admin, commander |
| PATCH | `/vehicles/:id` | Uredi vozilo | admin, commander |
| DELETE | `/vehicles/:id` | Deaktiviraj vozilo | admin |
| POST | `/vehicles/:id/drivers` | Dodaj voznika | admin, commander |
| DELETE | `/vehicles/:id/drivers/:userId` | Odstrani voznika | admin, commander |

### POST `/vehicles`
```json
{
  "name": "GVC 16/25",
  "vehicleType": "GVC-1",
  "licensePlate": "MB AB-123",
  "vin": "WBA...",
  "year": 2015,
  "mileage": 45000,
  "registrationExpires": "2024-06-30",
  "insuranceExpires": "2024-08-31",
  "serviceDue": "2024-03-15"
}
// vehicleType: oznaka po tipizaciji GZS (PV-1, GVC-1..4, GVV-1/2, GVGP-1/2,
// GVM-1/2, GRČ-1..3, PMB, PŠ ... — celoten seznam: VEHICLE_OZNAKE v
// backend/src/modules/vehicles/vehicle.entity.ts) ali stara vrednost
// (gvc | gvgp | ac | pv | van) ali 'other'
```

### GET `/vehicles/expiring?days=30`
Vrne vozila, kjer registration_expires, insurance_expires ali service_due pade v naslednjih N dneh.

---

## TRAININGS `/trainings`

| Metoda | Pot | Opis | Vloge |
|--------|-----|------|-------|
| GET | `/trainings` | Vsa usposabljanja org | admin, president, commander, secretary |
| GET | `/trainings/me` | Moja usposabljanja | vsi |
| GET | `/trainings/expiring` | Potekajoča (za dashboard) | admin, commander |
| GET | `/trainings/user/:userId` | Usposabljanja člana | admin, president, commander |
| POST | `/trainings` | Dodaj usposabljanje | admin, president, secretary |
| PATCH | `/trainings/:id` | Uredi | admin, president, secretary |
| DELETE | `/trainings/:id` | Izbriši | admin |

### POST `/trainings`
```json
{
  "userId": "uuid",
  "name": "Prva pomoč",
  "provider": "Rdeči križ",
  "completedAt": "2023-05-10",
  "expiresAt": "2026-05-10",
  "notes": "Opravljeno v Mariboru"
}
```

---

## NOTIFICATIONS `/notifications`

| Metoda | Pot | Opis | Vloge |
|--------|-----|------|-------|
| GET | `/notifications` | Moja obvestila | vsi |
| GET | `/notifications/all` | Vsa obvestila org | admin, president |
| POST | `/notifications` | Pošlji obvestilo | admin, president, commander, secretary |
| PATCH | `/notifications/:id/read` | Označi kot prebrano | vsi |
| GET | `/notifications/:id/reads` | Kdo je prebral | admin, president |

### POST `/notifications`
```json
{
  "title": "Odpovedan sestanek",
  "body": "Sestanek v petek je odpovedana. Novo vabilo sledi.",
  "target": "all",
  "type": "general"
}
// target: all | operative | youth | leadership | specific
// Če target = specific: "targetUserIds": ["uuid1", "uuid2"]
```

---

## DASHBOARD `/dashboard`

| Metoda | Pot | Opis | Vloge |
|--------|-----|------|-------|
| GET | `/dashboard/admin` | Dashboard za vodstvo | admin, president, commander, secretary |
| GET | `/dashboard/member` | Dashboard za člana | vsi |

### GET `/dashboard/admin` — Response
```json
{
  "members": {
    "total": 45,
    "active": 38,
    "operatives": 22,
    "availableNow": 14
  },
  "upcomingEvents": [ ... ],
  "expiringTrainings": [ ... ],
  "expiringVehicles": [ ... ],
  "availabilityBreakdown": {
    "available": 14,
    "at_work": 8,
    "on_leave": 3,
    "unavailable": 2
  }
}
```

### GET `/dashboard/member` — Response
```json
{
  "upcomingEvents": [ ... ],
  "myTrainings": [ ... ],
  "myNotifications": [ ... ],
  "myAvailability": "available",
  "myRsvps": [ ... ]
}
```

---

## ORGANIZATIONS `/organizations`

| Metoda | Pot | Opis | Vloge |
|--------|-----|------|-------|
| GET | `/organizations/me` | Podatki o mojem društvu | vsi |
| PATCH | `/organizations/me` | Uredi društvo (vklj. `spinObcine: string[]`) | admin, president |
| POST | `/organizations/me/logo` | Naloži logotip | admin, president |

---

## SPIN `/spin`

Obveščanje o intervencijah (glej `docs/MODULES.md §9a`).

| Metoda | Pot | Opis | Vloge |
|--------|-----|------|-------|
| GET | `/spin/obcine` | Statični seznam občin (`{ id, naziv, regija }[]`) | javno |
| GET | `/spin/settings` | Občine mojega društva (`{ obcine: string[] }`) | vsi |

Občine se nastavijo prek `PATCH /organizations/me` s poljem `spinObcine` (seznam
imen; prazen seznam = brez obveščanja). Mobilna aplikacija bere SPIN feed
neposredno s telefona in filtrira po teh občinah.

---

## DOCUMENTS `/documents`

| Metoda | Pot | Opis | Vloge |
|--------|-----|------|-------|
| GET | `/documents` | Seznam dokumentov | vsi |
| POST | `/documents` | Naloži dokument | admin, president, secretary |
| DELETE | `/documents/:id` | Izbriši dokument | admin |

---

## HTTP Status kode

| Koda | Pomen |
|------|-------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validacija) |
| 401 | Unauthorized (ni tokena) |
| 403 | Forbidden (napačna vloga) |
| 404 | Not Found |
| 409 | Conflict (duplikat) |
| 500 | Internal Server Error |
