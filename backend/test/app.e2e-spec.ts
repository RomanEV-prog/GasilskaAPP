// Izklopi rate limiting za teste (guard bere NODE_ENV ob vsaki zahtevi).
process.env.NODE_ENV = 'test';
// Master ključ za izdajo aktivacijskih kod v testih.
process.env.REGISTRATION_KEY = 'test-master-key';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * E2E testi — tečejo proti pravemu Postgresu (Docker).
 * Vsak zagon uporabi svež tenant (unikaten slug iz časovne značke),
 * zato ni potrebna posebna testna baza ali čiščenje.
 */
describe('GasilApp E2E', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const stamp = Date.now();
  const pass = 'GasilApp123!';
  const orgA = {
    organizationName: 'PGD E2E A',
    organizationSlug: `e2e-a-${stamp}`,
    firstName: 'Ana',
    lastName: 'Admin',
    email: `admin@e2e-a-${stamp}.si`,
    password: pass,
  };
  const orgB = {
    organizationName: 'PGD E2E B',
    organizationSlug: `e2e-b-${stamp}`,
    firstName: 'Bojan',
    lastName: 'Admin',
    email: `admin@e2e-b-${stamp}.si`,
    password: pass,
  };

  let tokenA = '';
  let tokenB = '';
  let refreshA = '';
  let orgAId = '';
  let memberToken = '';
  let memberId = '';

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    http = app.getHttpServer();

    // Izdaj aktivacijski kodi za registraciji obeh testnih društev.
    const res = await request(http)
      .post('/api/v1/auth/registration-codes')
      .set('x-master-key', 'test-master-key')
      .send({ count: 2, note: 'e2e' })
      .expect(201);
    (orgA as Record<string, string>).activationCode = res.body.data.codes[0];
    (orgB as Record<string, string>).activationCode = res.body.data.codes[1];
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth in registracija tenanta', () => {
    it('registrira društvo A in vrne org_admin žeton', async () => {
      const res = await request(http)
        .post('/api/v1/auth/register')
        .send(orgA)
        .expect(201);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.roles).toContain('org_admin');
      expect(res.body.data.user.username).toBe('ana.admin');
      tokenA = res.body.data.accessToken;
      orgAId = res.body.data.user.organizationId;
    });

    it('registrira društvo B', async () => {
      const res = await request(http)
        .post('/api/v1/auth/register')
        .send(orgB)
        .expect(201);
      tokenB = res.body.data.accessToken;
    });

    it('zavrne podvojeno oznako (409)', async () => {
      await request(http)
        .post('/api/v1/auth/register')
        .send(orgA)
        .expect(409);
    });

    it("zavrne registracijo z neveljavno aktivacijsko kodo (401)", async () => {
      await request(http)
        .post("/api/v1/auth/register")
        .send({
          organizationName: "PGD Brez Kode",
          organizationSlug: `e2e-nokod-${stamp}`,
          firstName: "X",
          lastName: "Y",
          email: `x@e2e-nokod-${stamp}.si`,
          password: pass,
          activationCode: "GASIL-XXXX-0000",
        })
        .expect(401);
    });

    it("zavrne ponovno uporabo porabljene kode (401)", async () => {
      await request(http)
        .post("/api/v1/auth/register")
        .send({
          ...orgA,
          organizationSlug: `e2e-reuse-${stamp}`,
          email: `reuse@e2e-${stamp}.si`,
        })
        .expect(401);
    });

    it("zavrne neveljavno oznako (400)", async () => {
      await request(http)
        .post('/api/v1/auth/register')
        .send({ ...orgB, organizationSlug: 'Ne Veljaven', email: 'x@y.si' })
        .expect(400);
    });

    it('prijava s pravilnim geslom vrne access + refresh (200)', async () => {
      const res = await request(http)
        .post('/api/v1/auth/login')
        .send({ username: orgA.email, password: pass })
        .expect(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      refreshA = res.body.data.refreshToken;
    });

    it('zavrne napačno geslo (401)', async () => {
      await request(http)
        .post('/api/v1/auth/login')
        .send({ username: orgA.email, password: 'napacno' })
        .expect(401);
    });

    it('zavrne zahtevo brez žetona (401)', async () => {
      await request(http).get('/api/v1/users').expect(401);
    });
  });

  describe('Refresh žetoni', () => {
    it('veljaven refresh žeton vrne nov par (200)', async () => {
      const res = await request(http)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refreshA })
        .expect(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // nov dostopni žeton deluje na zaščiteni poti
      await request(http)
        .get('/api/v1/users')
        .set(auth(res.body.data.accessToken))
        .expect(200);
    });

    it('dostopni žeton NE deluje kot refresh (401)', async () => {
      await request(http)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokenA })
        .expect(401);
    });

    it('zavrne zmazan refresh žeton (401)', async () => {
      await request(http)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'ni.veljaven.zeton' })
        .expect(401);
    });
  });

  describe('Multi-tenant izolacija', () => {
    it('A ustvari člana', async () => {
      const res = await request(http)
        .post('/api/v1/users')
        .set(auth(tokenA))
        .send({
          email: `clan@e2e-a-${stamp}.si`,
          password: pass,
          firstName: 'Miha',
          lastName: 'Član',
          roles: ['member'],
        })
        .expect(201);
      memberId = res.body.data.id;
      expect(memberId).toBeDefined();
    });

    it('A vidi svojega člana', async () => {
      const res = await request(http)
        .get('/api/v1/users')
        .set(auth(tokenA))
        .expect(200);
      const ids = res.body.data.map((u: { id: string }) => u.id);
      expect(ids).toContain(memberId);
    });

    it('B NE vidi člana društva A (izolacija)', async () => {
      const res = await request(http)
        .get('/api/v1/users')
        .set(auth(tokenB))
        .expect(200);
      const ids = res.body.data.map((u: { id: string }) => u.id);
      expect(ids).not.toContain(memberId);
    });

    it('B ne more prebrati člana A po ID (404)', async () => {
      await request(http)
        .get(`/api/v1/users/${memberId}`)
        .set(auth(tokenB))
        .expect(404);
    });
  });

  describe('RBAC — navaden član', () => {
    beforeAll(async () => {
      const res = await request(http)
        .post('/api/v1/auth/login')
        .send({ username: `clan@e2e-a-${stamp}.si`, password: pass })
        .expect(200);
      memberToken = res.body.data.accessToken;
    });

    it('član ne more ustvariti uporabnika (403)', async () => {
      await request(http)
        .post('/api/v1/users')
        .set(auth(memberToken))
        .send({
          email: `x@e2e-a-${stamp}.si`,
          password: pass,
          firstName: 'X',
          lastName: 'Y',
        })
        .expect(403);
    });

    it('član ne more ustvariti opreme (403)', async () => {
      await request(http)
        .post('/api/v1/equipment')
        .set(auth(memberToken))
        .send({ name: 'Nekaj', condition: 'good' })
        .expect(403);
    });
  });

  describe('Občutljiva polja se ne vračajo', () => {
    it('GET /users ne vsebuje passwordHash ali fcmToken', async () => {
      const res = await request(http)
        .get('/api/v1/users')
        .set(auth(tokenA))
        .expect(200);
      const raw = JSON.stringify(res.body);
      expect(raw).not.toContain('passwordHash');
      expect(raw).not.toContain('fcmToken');
    });
  });

  describe('Varnostni popravki', () => {
    it('org_admin NE more dodeliti vloge super_admin (403)', async () => {
      await request(http)
        .post('/api/v1/users')
        .set(auth(tokenA))
        .send({
          email: `esc@e2e-a-${stamp}.si`,
          password: pass,
          firstName: 'Esk',
          lastName: 'Alacija',
          roles: ['super_admin'],
        })
        .expect(403);
    });

    it('QR endpoint zahteva prijavo (401 brez žetona)', async () => {
      await request(http)
        .get('/api/v1/equipment/qr/GASILAPP-NEOBSTOJ-0001')
        .expect(401);
    });

    it('QR z veljavno prijavo vrne 404 za neobstoječo kodo (ne 401)', async () => {
      await request(http)
        .get('/api/v1/equipment/qr/GASILAPP-NEOBSTOJ-0001')
        .set(auth(tokenA))
        .expect(404);
    });
  });

  describe("Uporabnisko ime in gesla", () => {
    it("javni seznam drustev vsebuje A", async () => {
      const res = await request(http).get("/api/v1/auth/organizations").expect(200);
      const names = res.body.data.map((o: { name: string }) => o.name);
      expect(names).toContain("PGD E2E A");
    });

    it("prijava z uporabniskim imenom + organizationId (200)", async () => {
      const res = await request(http)
        .post("/api/v1/auth/login")
        .send({ username: "miha.clan", organizationId: orgAId, password: pass })
        .expect(200);
      expect(res.body.data.user.username).toBe("miha.clan");
    });

    it("prijava z uporabniskim imenom brez drustva (400)", async () => {
      await request(http)
        .post("/api/v1/auth/login")
        .send({ username: "miha.clan", password: pass })
        .expect(400);
    });

    it("ustvari clana BREZ e-poste; username se generira", async () => {
      const res = await request(http)
        .post("/api/v1/users")
        .set(auth(tokenA))
        .send({ password: pass, firstName: "Brez", lastName: "Poste" })
        .expect(201);
      expect(res.body.data.username).toBe("brez.poste");
      expect(res.body.data.email ?? null).toBeNull();
    });

    it("clan si spremeni geslo in se prijavi z novim", async () => {
      await request(http)
        .post("/api/v1/auth/change-password")
        .set(auth(memberToken))
        .send({ currentPassword: pass, newPassword: "NovoGeslo123!" })
        .expect(200);
      await request(http)
        .post("/api/v1/auth/login")
        .send({ username: "miha.clan", organizationId: orgAId, password: "NovoGeslo123!" })
        .expect(200);
    });

    it("napacno trenutno geslo (401)", async () => {
      await request(http)
        .post("/api/v1/auth/change-password")
        .set(auth(memberToken))
        .send({ currentPassword: "narobe", newPassword: "NovoGeslo123!" })
        .expect(401);
    });
  });

  describe("Oprema + QR koda", () => {
    it('ustvari opremo z inventarno št. → QR se generira', async () => {
      const res = await request(http)
        .post('/api/v1/equipment')
        .set(auth(tokenA))
        .send({
          name: 'Motorna žaga',
          inventoryNumber: `E2E-${stamp}`,
          condition: 'good',
        })
        .expect(201);
      expect(res.body.data.qrCode).toContain(`e2e-a-${stamp}`);
      expect(res.body.data.qrCode).toContain(`E2E-${stamp}`);
    });
  });

  describe('Feedback testerjev (2026-07-16)', () => {
    it('oprema sprejme rok veljave (expiryDate) in ga vrne', async () => {
      const res = await request(http)
        .post('/api/v1/equipment')
        .set(auth(tokenA))
        .send({
          name: 'Zaščitna obleka',
          condition: 'good',
          expiryDate: '2030-06-01',
        })
        .expect(201);
      expect(res.body.data.expiryDate).toBe('2030-06-01');
    });

    it('vozilo sprejme oznako po tipizaciji (GVC-1)', async () => {
      const res = await request(http)
        .post('/api/v1/vehicles')
        .set(auth(tokenA))
        .send({ name: 'GVC 16/25', vehicleType: 'GVC-1' })
        .expect(201);
      expect(res.body.data.vehicleType).toBe('GVC-1');
    });

    it('vozilo sprejme oznako s šumniki (GRČ-1) in staro vrednost (gvc)', async () => {
      await request(http)
        .post('/api/v1/vehicles')
        .set(auth(tokenA))
        .send({ name: 'Čoln', vehicleType: 'GRČ-1' })
        .expect(201);
      await request(http)
        .post('/api/v1/vehicles')
        .set(auth(tokenA))
        .send({ name: 'Staro vozilo', vehicleType: 'gvc' })
        .expect(201);
    });

    it('zavrne neveljavno oznako vozila (400)', async () => {
      await request(http)
        .post('/api/v1/vehicles')
        .set(auth(tokenA))
        .send({ name: 'X', vehicleType: 'NE-OBSTAJA' })
        .expect(400);
    });

    it('GET /users/me vrne moj profil s spinNotifications=true', async () => {
      const res = await request(http)
        .get('/api/v1/users/me')
        .set(auth(memberToken))
        .expect(200);
      expect(res.body.data.spinNotifications).toBe(true);
    });

    it('član si izklopi SPIN obvestila', async () => {
      const res = await request(http)
        .patch('/api/v1/users/me/spin-notifications')
        .set(auth(memberToken))
        .send({ spinNotifications: false })
        .expect(200);
      expect(res.body.data.spinNotifications).toBe(false);
      const me = await request(http)
        .get('/api/v1/users/me')
        .set(auth(memberToken))
        .expect(200);
      expect(me.body.data.spinNotifications).toBe(false);
    });

    it('prihodnjega neodpovedanega dogodka ni mogoče izbrisati (400)', async () => {
      const res = await request(http)
        .post('/api/v1/events')
        .set(auth(tokenA))
        .send({
          title: 'Prihodnja vaja',
          eventType: 'drill',
          startsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          sendNotification: false,
        })
        .expect(201);
      const eventId = res.body.data.id;
      await request(http)
        .delete(`/api/v1/events/${eventId}`)
        .set(auth(tokenA))
        .expect(400);

      // Po odpovedi je brisanje dovoljeno.
      await request(http)
        .patch(`/api/v1/events/${eventId}/cancel`)
        .set(auth(tokenA))
        .expect(200);
      await request(http)
        .delete(`/api/v1/events/${eventId}`)
        .set(auth(tokenA))
        .expect(200);
      await request(http)
        .get(`/api/v1/events/${eventId}`)
        .set(auth(tokenA))
        .expect(404);
    });

    it('pretekli dogodek je mogoče izbrisati', async () => {
      const res = await request(http)
        .post('/api/v1/events')
        .set(auth(tokenA))
        .send({
          title: 'Pretekla vaja',
          eventType: 'drill',
          startsAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
          sendNotification: false,
        })
        .expect(201);
      await request(http)
        .delete(`/api/v1/events/${res.body.data.id}`)
        .set(auth(tokenA))
        .expect(200);
    });

    it('član ne more izbrisati dogodka (403)', async () => {
      const res = await request(http)
        .post('/api/v1/events')
        .set(auth(tokenA))
        .send({
          title: 'Pretekli sestanek',
          eventType: 'meeting',
          startsAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          sendNotification: false,
        })
        .expect(201);
      await request(http)
        .delete(`/api/v1/events/${res.body.data.id}`)
        .set(auth(memberToken))
        .expect(403);
    });

    it('B ne more izbrisati dogodka društva A (404 — izolacija)', async () => {
      const res = await request(http)
        .post('/api/v1/events')
        .set(auth(tokenA))
        .send({
          title: 'Dogodek A',
          eventType: 'meeting',
          startsAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          sendNotification: false,
        })
        .expect(201);
      await request(http)
        .delete(`/api/v1/events/${res.body.data.id}`)
        .set(auth(tokenB))
        .expect(404);
    });
  });

  describe('Feedback testerjev (2026-07-17)', () => {
    let presidentToken = '';

    it('funkcija predsednik NE nosi upravljavskih pravic (403)', async () => {
      await request(http)
        .post('/api/v1/users')
        .set(auth(tokenA))
        .send({
          password: pass,
          firstName: 'Peter',
          lastName: 'Predsednik',
          roles: ['president'],
        })
        .expect(201);
      const login = await request(http)
        .post('/api/v1/auth/login')
        .send({
          username: 'peter.predsednik',
          organizationId: orgAId,
          password: pass,
        })
        .expect(200);
      presidentToken = login.body.data.accessToken;

      // Predsednik ne more ustvariti dogodka, člana ali urediti društva.
      await request(http)
        .post('/api/v1/events')
        .set(auth(presidentToken))
        .send({
          title: 'X',
          eventType: 'drill',
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          sendNotification: false,
        })
        .expect(403);
      await request(http)
        .post('/api/v1/users')
        .set(auth(presidentToken))
        .send({ password: pass, firstName: 'A', lastName: 'B' })
        .expect(403);
      await request(http)
        .patch('/api/v1/organizations/me')
        .set(auth(presidentToken))
        .send({ phone: '01 234 567' })
        .expect(403);
    });

    it('nov tip dogodka operative_day je sprejet', async () => {
      const res = await request(http)
        .post('/api/v1/events')
        .set(auth(tokenA))
        .send({
          title: 'Operativni dan',
          eventType: 'operative_day',
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          sendNotification: false,
        })
        .expect(201);
      expect(res.body.data.eventType).toBe('operative_day');
    });

    it('opomniki: veljavni odmiki sprejeti, neveljavni zavrnjeni', async () => {
      const res = await request(http)
        .post('/api/v1/events')
        .set(auth(tokenA))
        .send({
          title: 'Vaja z opomniki',
          eventType: 'drill',
          startsAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
          sendNotification: false,
          reminderOffsets: [4320, 1440],
        })
        .expect(201);
      expect(res.body.data.reminderOffsets).toEqual([4320, 1440]);

      await request(http)
        .post('/api/v1/events')
        .set(auth(tokenA))
        .send({
          title: 'X',
          eventType: 'drill',
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          sendNotification: false,
          reminderOffsets: [999],
        })
        .expect(400);
    });

    it('GET /events in /events/:id vrneta moj odziv (myRsvpStatus)', async () => {
      const res = await request(http)
        .post('/api/v1/events')
        .set(auth(tokenA))
        .send({
          title: 'Vaja z odzivom',
          eventType: 'drill',
          startsAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
          sendNotification: false,
          requiresRsvp: true,
        })
        .expect(201);
      const eventId = res.body.data.id;

      await request(http)
        .post(`/api/v1/events/${eventId}/rsvp`)
        .set(auth(memberToken))
        .send({ status: 'attending' })
        .expect(201);

      const one = await request(http)
        .get(`/api/v1/events/${eventId}`)
        .set(auth(memberToken))
        .expect(200);
      expect(one.body.data.myRsvpStatus).toBe('attending');

      const list = await request(http)
        .get('/api/v1/events')
        .set(auth(memberToken))
        .expect(200);
      const mine = list.body.data.find(
        (e: { id: string }) => e.id === eventId,
      );
      expect(mine.myRsvpStatus).toBe('attending');

      // Drug uporabnik ne vidi tujega odziva.
      const other = await request(http)
        .get(`/api/v1/events/${eventId}`)
        .set(auth(tokenA))
        .expect(200);
      expect(other.body.data.myRsvpStatus ?? null).toBeNull();
    });

    it('dogodek za izbrane člane: tuj član zavrnjen (400)', async () => {
      const res = await request(http)
        .post('/api/v1/events')
        .set(auth(tokenA))
        .send({
          title: 'Samo zate',
          eventType: 'meeting',
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          sendNotification: false,
          targetUserIds: [memberId],
        })
        .expect(201);
      expect(res.body.data.targetUserIds).toEqual([memberId]);

      // Član drugega društva → 400 (multi-tenant zaščita).
      const meB = await request(http)
        .get('/api/v1/users/me')
        .set(auth(tokenB))
        .expect(200);
      await request(http)
        .post('/api/v1/events')
        .set(auth(tokenA))
        .send({
          title: 'X',
          eventType: 'meeting',
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          sendNotification: false,
          targetUserIds: [meB.body.data.id],
        })
        .expect(400);
    });
  });

  describe('SPIN integracija', () => {
    it('GET /spin/obcine je javen in vrne statični seznam občin', async () => {
      const res = await request(http).get('/api/v1/spin/obcine').expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(200);
      expect(res.body.data[0]).toHaveProperty('naziv');
      expect(res.body.data[0]).toHaveProperty('regija');
    });

    it('GET /spin/settings brez avtentikacije → 401', async () => {
      await request(http).get('/api/v1/spin/settings').expect(401);
    });

    it('občine so privzeto nenastavljene (prazen seznam)', async () => {
      const res = await request(http)
        .get('/api/v1/spin/settings')
        .set(auth(tokenA))
        .expect(200);
      expect(res.body.data.obcine).toEqual([]);
    });

    it('nastavitev več občin se odraža v /spin/settings', async () => {
      await request(http)
        .patch('/api/v1/organizations/me')
        .set(auth(tokenA))
        .send({ spinObcine: ['Ljubljana', 'Kamnik'] })
        .expect(200);
      const res = await request(http)
        .get('/api/v1/spin/settings')
        .set(auth(tokenA))
        .expect(200);
      expect(res.body.data.obcine).toEqual(['Ljubljana', 'Kamnik']);
    });

    it('SPIN občine so izolirane med društvi (B ne vidi občin A)', async () => {
      const res = await request(http)
        .get('/api/v1/spin/settings')
        .set(auth(tokenB))
        .expect(200);
      expect(res.body.data.obcine).toEqual([]);
    });

    it('občine je mogoče izklopiti (prazen seznam počisti nastavljeno)', async () => {
      await request(http)
        .patch('/api/v1/organizations/me')
        .set(auth(tokenA))
        .send({ spinObcine: [] })
        .expect(200);
      const res = await request(http)
        .get('/api/v1/spin/settings')
        .set(auth(tokenA))
        .expect(200);
      expect(res.body.data.obcine).toEqual([]);
    });
  });

  describe('Zasebnost članov (predlogi Darjan, 2026-07-20)', () => {
    it('član dobi le ime, priimek, prijavno ime in status', async () => {
      const res = await request(http)
        .get('/api/v1/users')
        .set(auth(memberToken))
        .expect(200);
      const first = res.body.data[0];
      expect(first.firstName).toBeDefined();
      expect(first.lastName).toBeDefined();
      expect(first.username).toBeDefined();
      expect(first.membershipStatus).toBeDefined();
      // Osebni podatki sočlanov ne smejo priti niti po API-ju.
      expect(first.phone).toBeUndefined();
      expect(first.address).toBeUndefined();
      expect(first.dateOfBirth).toBeUndefined();
      expect(first.email).toBeUndefined();
      expect(first.roles).toBeUndefined();
    });

    it('admin še vedno vidi polne podatke', async () => {
      const res = await request(http)
        .get('/api/v1/users')
        .set(auth(tokenA))
        .expect(200);
      expect(res.body.data[0]).toHaveProperty('email');
      expect(res.body.data[0]).toHaveProperty('roles');
    });

    it('član ne more obiti omejitve prek GET /users/:id', async () => {
      const admin = await request(http)
        .get('/api/v1/users')
        .set(auth(tokenA))
        .expect(200);
      const other = admin.body.data.find(
        (u: { id: string }) => u.id !== memberId,
      );
      const res = await request(http)
        .get(`/api/v1/users/${other.id}`)
        .set(auth(memberToken))
        .expect(200);
      expect(res.body.data.phone).toBeUndefined();
      expect(res.body.data.email).toBeUndefined();
    });

    it('član vidi svoj polni profil prek /users/me', async () => {
      const res = await request(http)
        .get('/api/v1/users/me')
        .set(auth(memberToken))
        .expect(200);
      expect(res.body.data).toHaveProperty('email');
    });

    it('dosegljivi operativci ne razkrijejo telefonov', async () => {
      const res = await request(http)
        .get('/api/v1/users/available-operatives')
        .set(auth(memberToken))
        .expect(200);
      for (const u of res.body.data) {
        expect(u.phone).toBeUndefined();
        expect(u.address).toBeUndefined();
      }
    });
  });

  describe('Zadolžitve opreme (2026-07-20)', () => {
    let eqId = '';

    beforeAll(async () => {
      const res = await request(http)
        .post('/api/v1/equipment')
        .set(auth(tokenA))
        .send({
          name: 'Zaščitna obleka',
          inventoryNumber: `ZAD-${stamp}`,
          condition: 'good',
          purchaseDate: '2021-03-20',
        })
        .expect(201);
      eqId = res.body.data.id;
    });

    it('admin zadolži opremo članu', async () => {
      const res = await request(http)
        .post(`/api/v1/equipment/${eqId}/assignments`)
        .set(auth(tokenA))
        .send({ userId: memberId, issueNotes: 'Predano ob vaji.' })
        .expect(201);
      expect(res.body.data.userId).toBe(memberId);
      expect(res.body.data.returnedAt).toBeFalsy();
    });

    it('iste opreme ni mogoče zadolžiti dvakrat (409)', async () => {
      const res = await request(http)
        .post(`/api/v1/equipment/${eqId}/assignments`)
        .set(auth(tokenA))
        .send({ userId: memberId })
        .expect(409);
      expect(res.body.message).toContain('že zadolžena');
    });

    it('seznam opreme pokaže imetnika, a brez osebnih podatkov', async () => {
      const res = await request(http)
        .get('/api/v1/equipment')
        .set(auth(memberToken))
        .expect(200);
      const item = res.body.data.find((e: { id: string }) => e.id === eqId);
      expect(item.currentHolder.firstName).toBeDefined();
      expect(item.currentHolder.phone).toBeUndefined();
      expect(item.currentHolder.email).toBeUndefined();
    });

    it('član vidi svojo zadolženo opremo', async () => {
      const res = await request(http)
        .get('/api/v1/equipment/my-assignments')
        .set(auth(memberToken))
        .expect(200);
      expect(
        res.body.data.some(
          (a: { equipment: { id: string } }) => a.equipment.id === eqId,
        ),
      ).toBe(true);
    });

    it('član ne more zadolževati opreme (403)', async () => {
      await request(http)
        .post(`/api/v1/equipment/${eqId}/assignments`)
        .set(auth(memberToken))
        .send({ userId: memberId })
        .expect(403);
    });

    it('član ne vidi zgodovine zadolžitev (403)', async () => {
      await request(http)
        .get(`/api/v1/equipment/${eqId}/assignments`)
        .set(auth(memberToken))
        .expect(403);
    });

    it('drugo društvo ne more zadolžiti tuje opreme (404)', async () => {
      await request(http)
        .post(`/api/v1/equipment/${eqId}/assignments`)
        .set(auth(tokenB))
        .send({ userId: memberId })
        .expect(404);
    });

    it('vračilo zapre zadolžitev', async () => {
      const res = await request(http)
        .post(`/api/v1/equipment/${eqId}/assignments/return`)
        .set(auth(tokenA))
        .send({ returnNotes: 'Vrnjeno čisto.', conditionAtReturn: 'fair' })
        .expect(201);
      expect(res.body.data.returnedAt).toBeTruthy();
    });

    it('ponovno vračilo ni mogoče (404)', async () => {
      await request(http)
        .post(`/api/v1/equipment/${eqId}/assignments/return`)
        .set(auth(tokenA))
        .send({})
        .expect(404);
    });

    it('po vračilu je nova zadolžitev spet mogoča', async () => {
      await request(http)
        .post(`/api/v1/equipment/${eqId}/assignments`)
        .set(auth(tokenA))
        .send({ userId: memberId })
        .expect(201);
    });

    it('zgodovina vrne oba vnosa, najnovejši prvi', async () => {
      const res = await request(http)
        .get(`/api/v1/equipment/${eqId}/assignments`)
        .set(auth(tokenA))
        .expect(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].returnedAt).toBeFalsy();
      expect(res.body.data[1].returnedAt).toBeTruthy();
      expect(res.body.data[0].user.phone).toBeUndefined();
    });
  });

  describe('NFC oznake (2026-07-20)', () => {
    let eqId = '';
    let otherId = '';
    // UID oznake je globalno unikaten (ena fizična nalepka na svetu), zato ga
    // izpeljemo iz časovne značke — fiksna vrednost bi ob drugem zagonu
    // trčila sama vase, ker razvojna baza ostane med zagoni.
    const uid = `04${stamp.toString(16).toUpperCase().padStart(12, '0')}`;

    beforeAll(async () => {
      const a = await request(http)
        .post('/api/v1/equipment')
        .set(auth(tokenA))
        .send({ name: 'Čelada', inventoryNumber: `NFC-${stamp}` })
        .expect(201);
      eqId = a.body.data.id;
      const b = await request(http)
        .post('/api/v1/equipment')
        .set(auth(tokenA))
        .send({ name: 'Rokavice', inventoryNumber: `NFC2-${stamp}` })
        .expect(201);
      otherId = b.body.data.id;
    });

    it('oznako je mogoče povezati z opremo', async () => {
      const res = await request(http)
        .patch(`/api/v1/equipment/${eqId}`)
        .set(auth(tokenA))
        .send({ nfcUid: uid })
        .expect(200);
      expect(res.body.data.nfcUid).toBe(uid);
    });

    it('ista oznaka ne more biti na dveh kosih (409)', async () => {
      const res = await request(http)
        .patch(`/api/v1/equipment/${otherId}`)
        .set(auth(tokenA))
        .send({ nfcUid: uid })
        .expect(409);
      expect(res.body.message).toContain('že povezana');
    });

    it('neveljaven UID zavrnjen (400)', async () => {
      await request(http)
        .patch(`/api/v1/equipment/${otherId}`)
        .set(auth(tokenA))
        .send({ nfcUid: 'zzz' })
        .expect(400);
    });

    it('skeniranje vrne imetnika in datum nabave, brez podatkov vozila', async () => {
      const res = await request(http)
        .get(`/api/v1/equipment/nfc/${uid}`)
        .set(auth(memberToken))
        .expect(200);
      expect(res.body.data.name).toBe('Čelada');
      expect(res.body.data).toHaveProperty('currentHolder');
      const raw = JSON.stringify(res.body);
      expect(raw).not.toContain('vin');
      expect(raw).not.toContain('registrationNumber');
    });

    it('oznaka drugega društva ni dosegljiva (404)', async () => {
      await request(http)
        .get(`/api/v1/equipment/nfc/${uid}`)
        .set(auth(tokenB))
        .expect(404);
    });
  });
  // ─── Naročnine in aktivacijske kode (2026-07-28) ──────────────────────
  describe('Naročnine društev', () => {
    let dataSource: DataSource;
    let orgCId = '';
    let tokenC = '';
    /** Koda za podaljšanje društva C (12 mesecev). */
    let renewCode = '';

    const orgC = {
      organizationName: 'PGD E2E C',
      organizationSlug: `e2e-c-${stamp}`,
      firstName: 'Cvetka',
      lastName: 'Admin',
      email: `admin@e2e-c-${stamp}.si`,
      password: pass,
      activationCode: '',
    };

    /** Izda kodo prek endpointa z master ključem. */
    const issueCode = async (body: Record<string, unknown>) => {
      const res = await request(http)
        .post('/api/v1/auth/registration-codes')
        .set('x-master-key', 'test-master-key')
        .send(body)
        .expect(201);
      return res.body.data.codes[0] as string;
    };

    beforeAll(async () => {
      dataSource = app.get(DataSource);
      orgC.activationCode = await issueCode({ count: 1, validMonths: 2 });
    });

    it('registracija s kodo za 2 meseca nastavi rok naročnine', async () => {
      const res = await request(http)
        .post('/api/v1/auth/register')
        .send(orgC)
        .expect(201);
      tokenC = res.body.data.accessToken;
      orgCId = res.body.data.user.organizationId;

      const me = await request(http)
        .get('/api/v1/organizations/me')
        .set(auth(tokenC))
        .expect(200);
      const expires = new Date(me.body.data.subscriptionExpiresAt).getTime();
      const days = (expires - Date.now()) / (24 * 60 * 60 * 1000);
      expect(days).toBeGreaterThan(55);
      expect(days).toBeLessThan(63);
    });

    it('registracija s kodo brez veljavnosti da neomejeno naročnino', async () => {
      const code = await issueCode({ count: 1 });
      const res = await request(http)
        .post('/api/v1/auth/register')
        .send({
          organizationName: 'PGD E2E D',
          organizationSlug: `e2e-d-${stamp}`,
          firstName: 'Damjan',
          lastName: 'Admin',
          email: `admin@e2e-d-${stamp}.si`,
          password: pass,
          activationCode: code,
        })
        .expect(201);

      const me = await request(http)
        .get('/api/v1/organizations/me')
        .set(auth(res.body.data.accessToken))
        .expect(200);
      expect(me.body.data.subscriptionExpiresAt).toBeNull();
    });

    it('po poteku naročnine je pisanje blokirano (402), branje pa deluje', async () => {
      await dataSource.query(
        "UPDATE organizations SET subscription_expires_at = NOW() - INTERVAL '1 day' WHERE id = $1",
        [orgCId],
      );

      await request(http).get('/api/v1/events').set(auth(tokenC)).expect(200);

      await request(http)
        .post('/api/v1/events')
        .set(auth(tokenC))
        .send({
          title: 'Vaja po poteku',
          eventType: 'drill',
          startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        })
        .expect(402);
    });

    it('označitev obvestila prebranim ni blokirana po poteku', async () => {
      // Neobstoječe obvestilo → 404 (in NE 402): guard je endpoint spustil skozi.
      await request(http)
        .patch('/api/v1/notifications/00000000-0000-0000-0000-000000000000/read')
        .set(auth(tokenC))
        .expect(404);
    });

    it('podaljšanje s kodo odklene društvo', async () => {
      renewCode = await issueCode({
        count: 1,
        validMonths: 12,
        note: 'e2e obnova',
      });

      const res = await request(http)
        .post('/api/v1/organizations/me/redeem-code')
        .set(auth(tokenC))
        .send({ code: renewCode })
        .expect(200);
      const expires = new Date(res.body.data.subscriptionExpiresAt).getTime();
      expect(expires).toBeGreaterThan(Date.now());

      await request(http)
        .post('/api/v1/events')
        .set(auth(tokenC))
        .send({
          title: 'Vaja po podaljšanju',
          eventType: 'drill',
          startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        })
        .expect(201);
    });

    it('iste kode ni mogoče unovčiti dvakrat (400)', async () => {
      await request(http)
        .post('/api/v1/organizations/me/redeem-code')
        .set(auth(tokenC))
        .send({ code: renewCode })
        .expect(400);
    });

    it('navaden član ne more podaljšati naročnine (403)', async () => {
      await request(http)
        .post('/api/v1/organizations/me/redeem-code')
        .set(auth(memberToken))
        .send({ code: 'GASIL-XXXX-XXXX' })
        .expect(403);
    });

    it('preklicane kode ni mogoče uporabiti za registracijo (401)', async () => {
      const code = await issueCode({ count: 1, validMonths: 12 });
      await dataSource.query(
        'UPDATE registration_codes SET revoked_at = NOW() WHERE code = $1',
        [code],
      );
      await request(http)
        .post('/api/v1/auth/register')
        .send({
          organizationName: 'PGD E2E E',
          organizationSlug: `e2e-e-${stamp}`,
          firstName: 'Eva',
          lastName: 'Admin',
          email: `admin@e2e-e-${stamp}.si`,
          password: pass,
          activationCode: code,
        })
        .expect(401);
    });

    it('stran platforme je za org_admina prepovedana (403)', async () => {
      await request(http)
        .get('/api/v1/platform/organizations')
        .set(auth(tokenA))
        .expect(403);
      await request(http)
        .post('/api/v1/platform/codes')
        .set(auth(tokenA))
        .send({ count: 1, validMonths: 12 })
        .expect(403);
    });

    it('super_admin vidi vsa društva in izda kode', async () => {
      // Vloge super_admin se prek aplikacije ne da dodeliti (namerno) — v
      // testu jo vpišemo neposredno in se znova prijavimo, da pride v žeton.
      const [{ id: userId }] = await dataSource.query(
        'SELECT id FROM users WHERE email = $1',
        [orgC.email],
      );
      await dataSource.query(
        `INSERT INTO user_roles (user_id, organization_id, role)
         VALUES ($1, $2, 'super_admin')`,
        [userId, orgCId],
      );
      const login = await request(http)
        .post('/api/v1/auth/login')
        .send({ username: orgC.email, password: pass })
        .expect(200);
      const superToken = login.body.data.accessToken;

      const orgs = await request(http)
        .get('/api/v1/platform/organizations')
        .set(auth(superToken))
        .expect(200);
      expect(orgs.body.data.length).toBeGreaterThanOrEqual(3);
      expect(orgs.body.data[0]).toHaveProperty('memberCount');

      const issued = await request(http)
        .post('/api/v1/platform/codes')
        .set(auth(superToken))
        .send({ count: 2, validMonths: 12, note: 'e2e platform' })
        .expect(201);
      expect(issued.body.data).toHaveLength(2);
      expect(issued.body.data[0].code).toMatch(
        /^GASIL-[A-Z2-9]{4}-[A-Z2-9]{4}$/,
      );

      const codes = await request(http)
        .get('/api/v1/platform/codes')
        .set(auth(superToken))
        .expect(200);
      expect(
        codes.body.data.some((c: { status: string }) => c.status === 'used'),
      ).toBe(true);

      // Preklic še neporabljene kode.
      await request(http)
        .post(`/api/v1/platform/codes/${issued.body.data[0].id}/revoke`)
        .set(auth(superToken))
        .expect(200);
    });
  });
  // ─── Računi za naročnine (2026-07-28) ────────────────────────────────
  describe('Računi za naročnine', () => {
    let dataSource: DataSource;
    let superToken = '';
    let orgFId = '';
    let invoiceId = '';
    let invoiceNumber = '';

    const orgF = {
      organizationName: 'PGD E2E F',
      organizationSlug: `e2e-f-${stamp}`,
      firstName: 'Franc',
      lastName: 'Admin',
      email: `admin@e2e-f-${stamp}.si`,
      password: pass,
      activationCode: '',
    };

    beforeAll(async () => {
      dataSource = app.get(DataSource);

      const codeRes = await request(http)
        .post('/api/v1/auth/registration-codes')
        .set('x-master-key', 'test-master-key')
        .send({ count: 1, validMonths: 2 })
        .expect(201);
      orgF.activationCode = codeRes.body.data.codes[0];

      const reg = await request(http)
        .post('/api/v1/auth/register')
        .send(orgF)
        .expect(201);
      orgFId = reg.body.data.user.organizationId;

      // super_admin za dostop do /platform.
      const [{ id: userId }] = await dataSource.query(
        'SELECT id FROM users WHERE email = $1',
        [orgF.email],
      );
      await dataSource.query(
        `INSERT INTO user_roles (user_id, organization_id, role)
         VALUES ($1, $2, 'super_admin')`,
        [userId, orgFId],
      );
      const login = await request(http)
        .post('/api/v1/auth/login')
        .send({ username: orgF.email, password: pass })
        .expect(200);
      superToken = login.body.data.accessToken;
    });

    it('izda račun z zaporedno številko YYYY-NNN', async () => {
      const res = await request(http)
        .post('/api/v1/platform/invoices')
        .set(auth(superToken))
        .send({
          organizationId: orgFId,
          months: 12,
          amount: 120,
          note: 'Letna naročnina Plamen',
        })
        .expect(201);

      invoiceId = res.body.data.id;
      invoiceNumber = res.body.data.number;
      expect(invoiceNumber).toMatch(/^\d{4}-\d{3}$/);
      expect(res.body.data.months).toBe(12);
      expect(res.body.data.paidAt).toBeNull();
    });

    it('druga številka je zaporedna in unikatna', async () => {
      const res = await request(http)
        .post('/api/v1/platform/invoices')
        .set(auth(superToken))
        .send({ organizationId: orgFId, months: 1, amount: 12 })
        .expect(201);

      const prev = parseInt(invoiceNumber.slice(5), 10);
      expect(parseInt(res.body.data.number.slice(5), 10)).toBe(prev + 1);

      // Storniraj, da ne visi v odprtem dolgu.
      await request(http)
        .post(`/api/v1/platform/invoices/${res.body.data.id}/cancel`)
        .set(auth(superToken))
        .expect(200);
    });

    it('račun šteje v odprt dolg, dokler ni plačan', async () => {
      const res = await request(http)
        .get('/api/v1/platform/invoices/summary')
        .set(auth(superToken))
        .expect(200);
      expect(res.body.data.openCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.outstanding).toBeGreaterThanOrEqual(120);
    });

    it('označitev plačila podaljša naročnino društva', async () => {
      const before = await request(http)
        .get('/api/v1/platform/organizations')
        .set(auth(superToken))
        .expect(200);
      const orgBefore = before.body.data.find(
        (o: { id: string }) => o.id === orgFId,
      );
      const expiryBefore = new Date(orgBefore.subscriptionExpiresAt).getTime();

      await request(http)
        .post(`/api/v1/platform/invoices/${invoiceId}/paid`)
        .set(auth(superToken))
        .send({})
        .expect(200);

      const after = await request(http)
        .get('/api/v1/platform/organizations')
        .set(auth(superToken))
        .expect(200);
      const orgAfter = after.body.data.find(
        (o: { id: string }) => o.id === orgFId,
      );
      const expiryAfter = new Date(orgAfter.subscriptionExpiresAt).getTime();

      // 12 mesecev več kot prej (dopust nekaj dni zaradi dolžine mesecev).
      const daysAdded = (expiryAfter - expiryBefore) / (24 * 60 * 60 * 1000);
      expect(daysAdded).toBeGreaterThan(360);
      expect(daysAdded).toBeLessThan(370);
    });

    it('istega računa ni mogoče plačati dvakrat (400)', async () => {
      await request(http)
        .post(`/api/v1/platform/invoices/${invoiceId}/paid`)
        .set(auth(superToken))
        .send({})
        .expect(400);
    });

    it('plačanega računa ni mogoče stornirati (400)', async () => {
      await request(http)
        .post(`/api/v1/platform/invoices/${invoiceId}/cancel`)
        .set(auth(superToken))
        .expect(400);
    });

    it('izpis računa vrne podatke društva in izdajatelja', async () => {
      const res = await request(http)
        .get(`/api/v1/platform/invoices/${invoiceId}`)
        .set(auth(superToken))
        .expect(200);
      expect(res.body.data.organization.id).toBe(orgFId);
      expect(res.body.data.totals.gross).toBeGreaterThan(0);
      expect(res.body.data.issuer).toHaveProperty('missing');
    });

    it('paket naročnine je mogoče nastaviti', async () => {
      const res = await request(http)
        .patch(`/api/v1/platform/organizations/${orgFId}/subscription`)
        .set(auth(superToken))
        .send({ plan: 'monthly' })
        .expect(200);
      expect(res.body.data.subscriptionPlan).toBe('monthly');
    });

    it('neveljaven paket zavrnjen (400)', async () => {
      await request(http)
        .patch(`/api/v1/platform/organizations/${orgFId}/subscription`)
        .set(auth(superToken))
        .send({ plan: 'zastonj' })
        .expect(400);
    });

    it('plačilo ne omeji društva z neomejeno naročnino', async () => {
      await dataSource.query(
        'UPDATE organizations SET subscription_expires_at = NULL WHERE id = $1',
        [orgFId],
      );
      const created = await request(http)
        .post('/api/v1/platform/invoices')
        .set(auth(superToken))
        .send({ organizationId: orgFId, months: 12, amount: 120 })
        .expect(201);

      await request(http)
        .post(`/api/v1/platform/invoices/${created.body.data.id}/paid`)
        .set(auth(superToken))
        .send({})
        .expect(200);

      const [org] = await dataSource.query(
        'SELECT subscription_expires_at FROM organizations WHERE id = $1',
        [orgFId],
      );
      expect(org.subscription_expires_at).toBeNull();
    });

    it('org_admin ne vidi računov (403)', async () => {
      await request(http)
        .get('/api/v1/platform/invoices')
        .set(auth(tokenA))
        .expect(403);
    });
  });
});
