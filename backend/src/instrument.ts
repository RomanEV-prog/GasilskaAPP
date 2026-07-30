import * as Sentry from '@sentry/nestjs';

/**
 * Sentry se inicializira PRED vsem ostalim (prvi import v main.ts).
 * Brez SENTRY_DSN je izklopljen — razvoj in testi tečejo brez šuma,
 * vedenje je identično stanju pred uvedbo.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  // Samo napake, brez performance sledenja (varčevanje kvote).
  tracesSampleRate: 0,
});
