// Sentry mora biti prvi import (instrumentacija pred vsem ostalim).
import './instrument';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Za koliko proxyji teče backend (prod: eversum-caddy → gasilapp-web = 2).
  // Brez tega je req.ip IP zadnjega proxyja in rate-limit prijave deluje
  // GLOBALNO za vse uporabnike skupaj, namesto po dejanskem klientu.
  // Fiksno število hopov (ne `true`) — sicer klient s poljubnim
  // X-Forwarded-For ponaredi svoj IP in se limitu izogne.
  const trustProxyHops = Number(config.get<string>('TRUST_PROXY_HOPS', '0'));
  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  // Varnostni headerji za API odgovore. CSP je izklopljen — velja za HTML,
  // ki ga streže Caddy (frontend/Caddyfile), tu bi le zlomil Swagger UI v dev.
  app.use(helmet({ contentSecurityPolicy: false }));

  // Globalni prefix: /api/v1
  app.setGlobalPrefix('api/v1');

  // CORS za web portal / mobilno app.
  // Produkcija: strogo zaklenjeno na točni FRONTEND_URL (varnostna meja).
  // Dev: dovoli localhost na katerem koli portu — Vite zna izbrati drug port
  // (npr. ko je 3000 zaseden), brskalniška orodja za testiranje pa tečejo na
  // poljubnih portih. Mobilna app ne pošilja Origin (CORS je stvar brskalnika).
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const localhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  app.enableCors({
    origin: isProd
      ? frontendUrl
      : (origin, callback) => callback(null, !origin || localhostOrigin.test(origin)),
    credentials: true,
  });

  // Globalna validacija vseh DTO-jev.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger dokumentacija: /api/docs — SAMO v razvoju. Na produkciji bi javno
  // razkrivala celoten API (endpointe, DTO-je, vloge) vsakomur.
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GasilApp API')
      .setDescription('Interna organizacijska platforma za gasilska društva')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`GasilApp backend teče na http://localhost:${port}/api/v1`);
  if (!isProd) {
    // eslint-disable-next-line no-console
    console.log(`Swagger UI: http://localhost:${port}/api/docs`);
  }
}
bootstrap();
