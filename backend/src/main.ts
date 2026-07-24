import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

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

  // Swagger dokumentacija: /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GasilApp API')
    .setDescription('Interna organizacijska platforma za gasilska društva')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`GasilApp backend teče na http://localhost:${port}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`Swagger UI: http://localhost:${port}/api/docs`);
}
bootstrap();
