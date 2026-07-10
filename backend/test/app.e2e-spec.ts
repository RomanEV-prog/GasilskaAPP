// Izklopi rate limiting za teste (guard bere NODE_ENV ob vsaki zahtevi).
process.env.NODE_ENV = 'test';
// Master ključ za izdajo aktivacijskih kod v testih.
process.env.REGISTRATION_KEY = 'test-master-key';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
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
});
