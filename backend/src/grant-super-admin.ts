/**
 * Dodeli (ali odvzame) vlogo `super_admin` obstoječemu uporabniku.
 *
 * Vloge super_admin namenoma NI mogoče dodeliti prek aplikacije
 * (`UsersService.assertCanAssignRoles`) — sicer bi si jo lahko podelil vsak
 * administrator društva. Zato ta skripta, ki teče neposredno na strežniku.
 *
 * Zagon:
 *   npm run super-admin -- <e-pošta ali prijavno ime>
 *   npm run super-admin -- <e-pošta ali prijavno ime> --odvzemi
 *
 * V produkciji (Docker):
 *   docker exec -it gasilapp-api node dist/grant-super-admin.js admin@pgd-pekre.si
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { SystemRole } from './common/enums/roles.enum';
import { Organization } from './modules/organizations/organization.entity';
import { UserRole } from './modules/users/user-role.entity';
import { User } from './modules/users/user.entity';

loadEnv();

/* eslint-disable no-console */

async function main() {
  const identifier = process.argv[2];
  const revoke = process.argv.includes('--odvzemi');

  if (!identifier) {
    console.error(
      'Uporaba: npm run super-admin -- <e-pošta ali prijavno ime> [--odvzemi]',
    );
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? 'postgres',
    database: process.env.DB_NAME ?? 'gasilapp',
    entities: [Organization, User, UserRole],
  });
  await dataSource.initialize();

  const usersRepo = dataSource.getRepository(User);
  const rolesRepo = dataSource.getRepository(UserRole);

  const needle = identifier.toLowerCase();
  const user =
    (await usersRepo.findOne({ where: { email: needle } })) ??
    (await usersRepo.findOne({ where: { username: needle } }));

  if (!user) {
    console.error(`Uporabnika »${identifier}« ni v bazi.`);
    await dataSource.destroy();
    process.exit(1);
  }

  const existing = await rolesRepo.findOne({
    where: { userId: user.id, role: SystemRole.SUPER_ADMIN },
  });

  if (revoke) {
    if (!existing) {
      console.log(`${user.username} nima vloge super_admin — nič za narediti.`);
    } else {
      await rolesRepo.remove(existing);
      console.log(`Vloga super_admin odvzeta: ${user.username}.`);
    }
  } else if (existing) {
    console.log(`${user.username} je že super_admin.`);
  } else {
    await rolesRepo.save(
      rolesRepo.create({
        userId: user.id,
        organizationId: user.organizationId,
        role: SystemRole.SUPER_ADMIN,
      }),
    );
    console.log(
      `Vloga super_admin dodeljena: ${user.username} (${user.email ?? 'brez e-pošte'}).\n` +
        'Uporabnik se mora znova prijaviti, da vloga pride v žeton.',
    );
  }

  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Napaka:', err);
  process.exit(1);
});
