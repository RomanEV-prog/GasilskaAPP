# Plamen — API Endpoint Specifikacija

Base URL: `http://localhost:4000/api/v1`
Swagger UI: `http://localhost:4000/api/docs`

**Vsi endpointi (razen Auth) zahtevajo:** `Authorization: Bearer <jwt_token>`

**`orgId` se VEDNO bere iz JWT** — ne iz URL-ja ali body-ja.

**Model pravic (od 17. 7. 2026):** funkcije (predsednik, poveljnik, podpoveljnik,
tajnik ...) so samo nazivi brez pravic. Upravljanje = vloga `org_admin` (v tabelah
»admin«); izjema so tehnične vloge: glavni strojnik (vozila + oprema), orodjar in
pomočnik za zaščito dihal (oprema).

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
| GET | `/users` | Seznam vseh članov (skrčen za ne-admine ↓) | vsi |
| GET | `/users/me` | Moj profil (vedno poln) | vsi |
| GET | `/users/:id` | Profil člana (skrčen za ne-admine ↓) | vsi |
| GET | `/users/availability` | Pregled razpoložljivosti | vsi |
| GET | `/users/available-operatives` | Dosegljivi operativci (skrčen ↓) | vsi |
| POST | `/users` | Dodaj člana | admin |
| PATCH | `/users/me/availability` | Moja razpoložljivost | vsi |
| PATCH | `/users/me/spin-notifications` | Vklop/izklop mojih SPIN obvestil | vsi |
| PATCH | `/users/:id` | Uredi člana | admin |
| DELETE | `/users/:id` | Deaktiviraj člana | admin |

### Zasebnost članov (od 20. 7. 2026)
Navadni člani dobijo le `id, firstName, lastName, username, membershipStatus,
isActive` — brez telefona, e-pošte, naslova, datuma rojstva in vlog. Polne
podatke vidijo samo vloge iz `MEMBER_DIRECTORY_ROLES` (`org_admin`,
`super_admin`); vsak član vedno vidi svoj polni profil. Meja je strežniška —
skrivanje v vmesniku ne bi zadostovalo, ker podatki potujejo po API-ju.

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
| POST | `/events` | Ustvari dogodek | admin |
| PATCH | `/events/:id` | Uredi dogodek | admin |
| PATCH | `/events/:id/cancel` | Odpovej dogodek | admin |
| DELETE | `/events/:id` | Izbriši dogodek (samo pretekle ali odpovedane) | admin |
| POST | `/events/:id/rsvp` | Potrdi udeležbo | vsi |
| GET | `/events/:id/rsvps` | Poglej odzive | admin |
| POST | `/events/:id/attendance` | Označi prisotnost | admin |

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
  "targetUserIds": ["uuid-1", "uuid-2"],
  "requiresRsvp": true,
  "sendNotification": true,
  "reminderOffsets": [4320, 1440]
}
// eventType: drill | meeting | competition | intervention | cleanup | celebration | assembly | operative_day | other
// targetUserIds (neobvezno): obvestilo in opomniki samo tem članom (prazno = po targetGroup)
// reminderOffsets (neobvezno): opomniki pred začetkom v minutah —
//   dovoljeno 10080 (7 dni), 4320 (3 dni), 1440 (1 dan), 180 (3 ure), 60 (1 ura)
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
| GET | `/vehicles/expiring` | Vozila s potekajočimi roki | admin, glavni strojnik |
| POST | `/vehicles` | Dodaj vozilo | admin, glavni strojnik |
| PATCH | `/vehicles/:id` | Uredi vozilo | admin, glavni strojnik |
| DELETE | `/vehicles/:id` | Deaktiviraj vozilo | admin |
| POST | `/vehicles/:id/drivers` | Dodaj voznika | admin, glavni strojnik |
| DELETE | `/vehicles/:id/drivers/:userId` | Odstrani voznika | admin, glavni strojnik |

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

## EQUIPMENT `/equipment`

`upravljavci` = `org_admin`, `chief_machinist`, `toolkeeper`,
`assistant_breathing_apparatus`.

| Metoda | Pot | Opis | Vloge |
|--------|-----|------|-------|
| GET | `/equipment` | Seznam opreme (z `currentHolder`) | vsi |
| GET | `/equipment/:id` | Podrobnosti opreme | vsi |
| GET | `/equipment/qr/:qrCode` | Podatki preko QR kode | vsi |
| GET | `/equipment/nfc/:uid` | Podatki preko NFC oznake | vsi |
| GET | `/equipment/my-assignments` | Moja zadolžena oprema | vsi |
| GET | `/equipment/inspections-due?days=30` | Oprema s pregledom | upravljavci |
| POST | `/equipment` | Dodaj opremo | upravljavci |
| PATCH | `/equipment/:id` | Uredi opremo (tudi `nfcUid`) | upravljavci |
| DELETE | `/equipment/:id` | Deaktiviraj opremo | admin |
| POST | `/equipment/:id/assignments` | Zadolži članu | upravljavci |
| POST | `/equipment/:id/assignments/return` | Vrni opremo | upravljavci |
| GET | `/equipment/:id/assignments` | Zgodovina zadolžitev | upravljavci |

### Skeniranje (QR in NFC)
Obe poti vračata isto **namerno ozko** projekcijo (brez VIN/registrske/
zavarovanja vozila), obogateno s `currentHolder` (samo ime in priimek),
`issuedAt` in `purchaseDate` — cilj skeniranja je ugotoviti, komu kos pripada
in kako star je.

`nfcUid` je strojni UID nalepke (NTAG213). Sprejema hex z neobveznimi ločili
(`04:1F:2E:…`), shrani se normaliziran (velike črke, brez ločil). Je **globalno**
unikaten, ker je ena fizična nalepka na svetu ena sama; `null` ga odklopi.

### Zadolžitve
Kos opreme ima največ eno odprto zadolžitev (`returned_at IS NULL`), kar vsili
delni unikatni indeks v bazi. Ponovna zadolžitev brez vračila → **409**.
Vračilo brez odprte zadolžitve → **404**. Član iz drugega društva → **400**.

---

## TRAININGS `/trainings`

| Metoda | Pot | Opis | Vloge |
|--------|-----|------|-------|
| GET | `/trainings` | Vsa usposabljanja org | admin |
| GET | `/trainings/me` | Moja usposabljanja | vsi |
| GET | `/trainings/expiring` | Potekajoča (za dashboard) | admin |
| GET | `/trainings/user/:userId` | Usposabljanja člana | admin |
| POST | `/trainings` | Dodaj usposabljanje | admin |
| PATCH | `/trainings/:id` | Uredi | admin |
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
| GET | `/notifications/all` | Vsa obvestila org | admin |
| POST | `/notifications` | Pošlji obvestilo | admin |
| PATCH | `/notifications/:id/read` | Označi kot prebrano | vsi |
| GET | `/notifications/:id/reads` | Kdo je prebral | admin |

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
| GET | `/dashboard/admin` | Dashboard za vodstvo | admin |
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
| PATCH | `/organizations/me` | Uredi društvo (vklj. `spinObcine: string[]`) | admin |
| POST | `/organizations/me/logo` | Naloži logotip | admin |

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
| POST | `/documents` | Naloži dokument | admin |
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
