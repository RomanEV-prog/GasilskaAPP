// Izklopi rate limiting za teste (guard bere NODE_ENV ob vsaki zahtevi).
process.env.NODE_ENV = 'test';

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
      tokenA = res.body.data.accessToken;
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

    it('zavrne neveljavno oznako (400)', async () => {
      await request(http)
        .post('/api/v1/auth/register')
        .send({ ...orgB, organizationSlug: 'Ne Veljaven', email: 'x@y.si' })
        .expect(400);
    });

    it('prijava s pravilnim geslom vrne access + refresh (200)', async () => {
      const res = await request(http)
        .post('/api/v1/auth/login')
        .send({ email: orgA.email, password: pass })
        .expect(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      refreshA = res.body.data.refreshToken;
    });

    it('zavrne napačno geslo (401)', async () => {
      await request(http)
        .post('/api/v1/auth/login')
        .send({ email: orgA.email, password: 'napacno' })
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
        .send({ email: `clan@e2e-a-${stamp}.si`, password: pass })
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

  describe('Oprema + QR koda', () => {
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
});
