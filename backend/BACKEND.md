# GasilApp — Backend (NestJS)

## Setup

```bash
# Ustvari NestJS projekt
npm i -g @nestjs/cli
nest new gasilapp-backend --package-manager npm
cd gasilapp-backend

# Namesti dependencies
npm install @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/typeorm @nestjs/swagger
npm install passport passport-jwt bcryptjs typeorm pg uuid firebase-admin
npm install class-validator class-transformer
npm install -D @types/passport-jwt @types/bcryptjs @types/uuid
```

## Struktura projekta

```
gasilapp-backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   └── enums/
│   │       └── roles.enum.ts
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── dto/auth.dto.ts
│       │   └── strategies/jwt.strategy.ts
│       ├── organizations/
│       │   ├── organizations.module.ts
│       │   ├── organizations.controller.ts
│       │   ├── organizations.service.ts
│       │   ├── organization.entity.ts
│       │   └── dto/organization.dto.ts
│       ├── users/
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   ├── user.entity.ts
│       │   ├── user-role.entity.ts
│       │   └── dto/user.dto.ts
│       ├── events/
│       │   ├── events.module.ts
│       │   ├── events.controller.ts
│       │   ├── events.service.ts
│       │   ├── event.entity.ts
│       │   ├── event-rsvp.entity.ts
│       │   ├── event-attendance.entity.ts
│       │   └── dto/event.dto.ts
│       ├── vehicles/
│       │   ├── vehicles.module.ts
│       │   ├── vehicles.controller.ts
│       │   ├── vehicles.service.ts
│       │   ├── vehicle.entity.ts
│       │   ├── vehicle-driver.entity.ts
│       │   └── dto/vehicle.dto.ts
│       ├── equipment/
│       │   ├── equipment.module.ts
│       │   ├── equipment.controller.ts
│       │   ├── equipment.service.ts
│       │   ├── equipment.entity.ts
│       │   └── dto/equipment.dto.ts
│       ├── trainings/
│       │   ├── trainings.module.ts
│       │   ├── trainings.controller.ts
│       │   ├── trainings.service.ts
│       │   ├── training.entity.ts
│       │   └── dto/training.dto.ts
│       ├── notifications/
│       │   ├── notifications.module.ts
│       │   ├── notifications.controller.ts
│       │   ├── notifications.service.ts
│       │   ├── notification.entity.ts
│       │   ├── notification-read.entity.ts
│       │   ├── firebase.service.ts
│       │   └── dto/notification.dto.ts
│       └── dashboard/
│           ├── dashboard.module.ts
│           ├── dashboard.controller.ts
│           └── dashboard.service.ts
├── .env
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

## .env

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=gasilapp

# JWT
JWT_SECRET=ZAMENJAJ_Z_DOLGIM_RANDOM_STRINGOM
JWT_EXPIRES_IN=7d

# App
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Firebase (za push obvestila)
FIREBASE_PROJECT_ID=gasilapp
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@gasilapp.iam.gserviceaccount.com
```

## Zagon

```bash
# Zaženi PostgreSQL (Docker)
docker run --name gasilapp-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=gasilapp \
  -p 5432:5432 -d postgres:15

# Izvedi SQL shemo
psql -U postgres -d gasilapp -f ../docs/schema.sql
# ali kopiraj vsebino iz docs/DATABASE.md

# Zaženi backend
npm run start:dev

# Swagger UI
open http://localhost:4000/api/docs
```

## Vzorec pisanja modula

```typescript
// 1. Entity
@Entity('ime_tabele')
export class ImeEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'organization_id' }) organizationId: string;
  // ...
}

// 2. DTO
export class CreateImeDto {
  @IsString() name: string;
  // ...
}

// 3. Service — VEDNO filtriraj po organizationId
@Injectable()
export class ImeService {
  async findAll(organizationId: string) {
    return this.repo.find({ where: { organizationId } });
  }
}

// 4. Controller — organizationId IZ JWT
@Controller('ime')
export class ImeController {
  @Get()
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAll(orgId);
  }
}

// 5. Module
@Module({
  imports: [TypeOrmModule.forFeature([ImeEntity])],
  controllers: [ImeController],
  providers: [ImeService],
  exports: [ImeService],
})
export class ImeModule {}
```

## Testiranje z cURL

```bash
# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pgd-pekre.si","password":"GasilApp123!"}'

# Seznam članov (z tokenom)
curl http://localhost:4000/api/v1/users \
  -H "Authorization: Bearer <token>"
```

## Prioriteta razvoja

1. ✅ Common (guards, decorators, filters, interceptors, enums)
2. ✅ Auth modul
3. ✅ Organizations modul
4. ✅ Users modul
5. ✅ Events modul
6. ✅ Vehicles modul
7. ✅ Trainings modul
8. ✅ Notifications modul + Firebase
9. ✅ Equipment modul
10. ✅ Dashboard modul
11. ✅ Documents modul
12. ✅ Audit log (globalni interceptor, CLAUDE.md pravilo #6)
13. ✅ Cron opomniki (vozila + usposabljanja, dnevno ob 08:00)
14. ✅ Logo upload (`POST /organizations/me/logo`)
15. ✅ Rate limiting (`@nestjs/throttler`): globalno 100/min, Auth 5/min (login/register), 3/min (forgot-password). Per-endpoint po IP. **Prod:** in-memory storage → za več instanc uporabi Redis storage.
16. ✅ E2E testi (`npm run test:e2e`, Jest+supertest, `test/app.e2e-spec.ts`): auth, multi-tenant izolacija, RBAC, občutljiva polja, QR. Tečejo proti Docker Postgresu, svež tenant na zagon (unikaten slug iz `Date.now()`). Throttler se v `NODE_ENV=test` preskoči (`GasilThrottlerGuard.shouldSkip`).

## Gotchas (naučeno)

- **`DB_SYNCHRONIZE=false`** — shema pride iz `docs/schema.sql` z lastnimi enum tipi; TypeORM synchronize se z njimi tepe.
- **TypeORM `.update()` z `null`** na opcijskem polju ne prevede — uporabi raw `() => 'NULL'`.
- **`StreamableFile`** mora skozi globalni `TransformInterceptor` nedotaknjen (sicer se serializira v JSON).
- **Multipart boolean** (npr. `isPublic`): `enableImplicitConversion` pretvori vsak neprazen niz (tudi `"false"`) v `true` — beri surovo vrednost z `@Transform(({ obj }) => ...)`.
- **AuditInterceptor** registriran ZA TransformInterceptorjem = notranji, zato `tap()` vidi surov rezultat handlerja (z `.id`).
- **Občutljiva polja** (`passwordHash`, `fcmToken`): `select: false` na entiteti + `sanitize()` v servisu.
