/**
 * Ročni zagon dnevnih opomnikov (za test / ad-hoc).
 * Zagon: `npx ts-node src/run-reminders.ts`
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RemindersService } from './modules/scheduler/reminders.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  const reminders = app.get(RemindersService);
  await reminders.runDailyChecks();
  await app.close();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
