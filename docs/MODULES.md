# GasilApp — Opis modulov

## Splošna pravila za vse module

```typescript
// ✅ PRAVILNO — vedno filtriraj po organizationId
async findAll(organizationId: string) {
  return this.repo.find({ where: { organizationId } });
}

// ❌ NAROBE — nikoli brez filtra
async findAll() {
  return this.repo.find(); // vrne podatke VSEH društev!
}
```

---

## 1. Auth modul (`/modules/auth`)

**Namen:** Prijava, registracija, JWT, reset gesla.

### Datoteke
```
auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/auth.dto.ts          ← LoginDto, RegisterOrganizationDto, ...
└── strategies/jwt.strategy.ts
```

### JWT Payload
```typescript
{
  sub: string;           // user.id
  email: string;
  orgId: string;         // organizationId
  roles: SystemRole[];
}
```

### Opombe
- Gesla hashiraj z `bcrypt`, rounds: **12**
- JWT expiry: **7 dni** (nastavljivo v `.env`)
- `organizationId` se vedno bere iz JWT, ne iz body
- Ob registraciji novega društva se samodejno ustvari `org_admin` vloga

---

## 2. Users modul (`/modules/users`)

**Namen:** CRUD za člane, upravljanje vlog, razpoložljivost.

### Datoteke
```
users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── user.entity.ts
├── user-role.entity.ts
└── dto/user.dto.ts       ← CreateUserDto, UpdateUserDto, UpdateAvailabilityDto
```

### Ključne metode servisa
```typescript
findAll(organizationId, filters?)       // seznam članov
findOne(organizationId, userId)         // profil člana — 404 če ni v tej org
create(organizationId, dto)             // ustvari člana
update(organizationId, userId, dto)     // posodobi — preveri orgId
deactivate(organizationId, userId)      // soft delete (is_active = false)
updateAvailability(userId, dto)         // vsak za sebe
getAvailabilityOverview(organizationId) // za dashboard
getAvailableOperatives(organizationId)  // za dashboard
```

### Varnost
- `email` mora biti UNIQUE znotraj organizacije (ne globalno)
- Ob kreaciji člana se samodejno generira začetno geslo (`GasilApp123!`) in pošlje email
- `passwordHash` in `fcmToken` se **nikoli** ne vrneta v API odgovorih

---

## 3. Organizations modul (`/modules/organizations`)

**Namen:** Upravljanje podatkov o društvu.

### Datoteke
```
organizations/
├── organizations.module.ts
├── organizations.controller.ts
├── organizations.service.ts
├── organization.entity.ts
└── dto/organization.dto.ts
```

### Opombe
- Vsak user vidi samo svojo organizacijo (iz JWT `orgId`)
- `slug` je immutable po kreaciji
- `settings` je JSONB za per-tenant konfiguracije

---

## 4. Events modul (`/modules/events`)

**Namen:** Koledar, CRUD za dogodke, RSVP, prisotnost.

### Datoteke
```
events/
├── events.module.ts
├── events.controller.ts
├── events.service.ts
├── event.entity.ts
├── event-rsvp.entity.ts
├── event-attendance.entity.ts
└── dto/event.dto.ts       ← CreateEventDto, RsvpDto, MarkAttendanceDto
```

### Ključne metode servisa
```typescript
findAll(organizationId, from?, to?)        // po datumu
findUpcoming(organizationId, limit?)       // za dashboard
create(organizationId, createdBy, dto)
update(organizationId, id, dto)
cancel(organizationId, id)                 // is_cancelled = true
rsvp(eventId, userId, dto)                 // upsert
getRsvps(organizationId, eventId)
markAttendance(organizationId, eventId, markedBy, dto)
getAttendanceStats(organizationId, userId)
```

### Opombe
- `targetGroup` je array membership_status — null pomeni VSI
- Ko se ustvari dogodek z `sendNotification: true`, modul Notifications dobi klic
- Opomnik (`reminderMinutes`) se pošlje z cron jobom (TODO: Bull Queue)

---

## 5. Vehicles modul (`/modules/vehicles`)

**Namen:** Register vozil, roki tehničnih pregledov in zavarovanj.

### Datoteke
```
vehicles/
├── vehicles.module.ts
├── vehicles.controller.ts
├── vehicles.service.ts
├── vehicle.entity.ts
├── vehicle-driver.entity.ts
└── dto/vehicle.dto.ts
```

### Ključne metode servisa
```typescript
findAll(organizationId)
findOne(organizationId, id)
create(organizationId, dto)
update(organizationId, id, dto)
deactivate(organizationId, id)
getExpiringVehicles(organizationId, daysAhead?)   // za dashboard
addDriver(vehicleId, userId)
removeDriver(vehicleId, userId)
```

### Opomniki
Cron job vsak dan ob 08:00 preveri:
- `registration_expires` ≤ 30 dni → pošlje push obvestilo adminu
- `insurance_expires` ≤ 30 dni → isto
- `service_due` ≤ 30 dni → isto

---

## 6. Equipment modul (`/modules/equipment`)

**Namen:** Inventar opreme z QR kodami.

### Datoteke
```
equipment/
├── equipment.module.ts
├── equipment.controller.ts
├── equipment.service.ts
├── equipment.entity.ts
└── dto/equipment.dto.ts
```

### QR koda
- Ob kreaciji opreme se generira unikaten QR string: `GASILAPP-{org_slug}-{inventory_number}`
- Endpoint `GET /equipment/qr/:qrCode` vrne podatke o opremi (javno za skeniranje)

---

## 7. Trainings modul (`/modules/trainings`)

**Namen:** Evidenca usposabljanj, certifikatov in opomniki pred potekom.

### Datoteke
```
trainings/
├── trainings.module.ts
├── trainings.controller.ts
├── trainings.service.ts
├── training.entity.ts
└── dto/training.dto.ts
```

### Ključne metode servisa
```typescript
findAll(organizationId)
findByUser(organizationId, userId)
findMine(userId)
findExpiring(organizationId, daysAhead?)    // za dashboard
create(organizationId, dto)
update(organizationId, id, dto)
delete(organizationId, id)
```

### Opomniki
Cron job vsak dan ob 08:00:
- `expires_at` ≤ 60 dni → push za člana
- `expires_at` ≤ 30 dni → push za člana + admina
- `reminder_sent = true` po poslanem, da ne pošlješ dvakrat

---

## 8. Notifications modul (`/modules/notifications`)

**Namen:** Push obvestila (FCM) + interna obvestila v aplikaciji.

### Datoteke
```
notifications/
├── notifications.module.ts
├── notifications.controller.ts
├── notifications.service.ts
├── notification.entity.ts
├── notification-read.entity.ts
├── dto/notification.dto.ts
└── firebase.service.ts        ← FCM wrapper
```

### Firebase setup
```typescript
// firebase.service.ts
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  async sendToUser(fcmToken: string, title: string, body: string, data?: object) { ... }
  async sendToTopic(topic: string, title: string, body: string) { ... }  // npr. org-slug
  async sendToMultiple(tokens: string[], title: string, body: string) { ... }
}
```

### Targets
- `all` → pošlji vsem aktivnim članom organizacije
- `operative` → samo membership_status = 'operative'
- `youth` → samo membership_status = 'youth'
- `leadership` → vloge: president, commander, secretary, treasurer
- `specific` → seznam userId-jev

---

## 9. Dashboard modul (`/modules/dashboard`)

**Namen:** Agregirani podatki za home screen.

### Datoteke
```
dashboard/
├── dashboard.module.ts
├── dashboard.controller.ts
└── dashboard.service.ts    ← bere iz vseh ostalih servisov
```

### Admin dashboard aggegati
```typescript
{
  members: { total, active, operatives, availableNow },
  upcomingEvents: Event[],          // naslednji 5
  expiringTrainings: Training[],    // poteče v 60 dneh
  expiringVehicles: Vehicle[],      // rok v 30 dneh
  availabilityBreakdown: Record<AvailabilityStatus, number>
}
```

### Member dashboard agregati
```typescript
{
  upcomingEvents: Event[],          // naslednji 3
  myTrainings: Training[],          // ki kmalu potečejo
  myNotifications: Notification[],  // zadnjih 5 neprebranih
  myAvailability: AvailabilityStatus,
  myRsvps: EventRsvp[]             // prihajajoči z mojim RSVP
}
```

---

## 9a. SPIN modul (`/modules/spin`)

Integracija z javnim portalom **SPIN** (spin3.sos112.si, URSZR) za obveščanje
članov o intervencijah v občini društva. NI alarmiranje (to pokriva Vulkan/GZS) —
je informativno obveščanje z zamikom nekaj minut.

### Vir podatkov
- Javni RSS `https://spin3.sos112.si/Javno/ODApi/True` — takojšnji feed aktiviranih
  intervencij. Sveže intervencije imajo v `<description>` **golo ime občine**
  (opisno besedilo se doda pozneje) → zanesljivo ujemanje po imenu občine.
  **SPIN geo-omejuje na SI IP** → prod (tuji strežnik) bere prek relaya (`SPIN_BASE_URL`,
  glej `infra/DEPLOY.md §10`); mobilni zavihek SPIN bere feed neposredno s telefona.
- Seznam občin je **vgrajen statično** (`spin/obcine.data.ts`), ne kliče se več
  `odObmocje` v živo (ker je geo-omejen).

### Datoteke
- `spin.service.ts` — `@Cron('*/2 * * * *')` poll (z overlap-guardom): parsanje RSS,
  bulk dedup po `spinGuid`, ujemanje po občini (točno za golo ime, meja besede za
  narativ), obvestilo prek `NotificationsService` (target `OPERATIVE`, type `spin`).
  `onModuleInit`/prvi uspešni poll napolni bazo guid-ov **brez** obvestil — dokler
  `primed=false` se ne pošilja (prepreči poplavo, tudi če je feed ob zagonu nedosegljiv).
- `spin-intervention.entity.ts` — deljen predpomnilnik (brez `organization_id`),
  unikaten `spin_guid`. Piše ga le poller (dedup); HTTP endpoint ga ne bere.
- `spin.controller.ts` — `GET /spin/obcine` (javno, statični seznam),
  `GET /spin/settings` (avtenticiran → ime občine društva za mobilni prikaz).

### Nastavitev
Društvo izbere občino v spletnem portalu (Nastavitve → Društvo → Občina).
`organizations.spin_obcina` (ime; ujemanje teče po imenu).
Prazna občina = brez obveščanja (počisti se s `null`). V testih (`NODE_ENV=test`) je poll izklopljen.

## 10. Common (`/common`)

### Guards
- `JwtAuthGuard` — preverja JWT token, podpira `@Public()` decorator
- `RolesGuard` — preverja vloge, SuperAdmin gre skozi vedno

### Decorators
- `@CurrentUser()` — izvleče user iz req (id, email, organizationId, roles)
- `@Roles(...roles)` — nastavi zahtevane vloge
- `@Public()` — izvzame endpoint iz JWT preverjanja

### Filters
- `HttpExceptionFilter` — uniformni error format

### Interceptors
- `TransformInterceptor` — wraps vse response v `{ success, data, timestamp }`
