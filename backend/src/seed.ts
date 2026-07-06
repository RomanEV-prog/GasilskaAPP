/**
 * Seed podatki za razvoj — ustvari test društvo + org_admin uporabnika.
 * Zagon: `npm run seed`
 * Poverilnice: admin@pgd-pekre.si / GasilApp123!
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { SystemRole } from './common/enums/roles.enum';
import { Organization } from './modules/organizations/organization.entity';
import { UserRole } from './modules/users/user-role.entity';
import { User } from './modules/users/user.entity';

loadEnv();

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? 'postgres',
    database: process.env.DB_NAME ?? 'gasilapp',
    entities: [Organization, User, UserRole],
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  });

  await dataSource.initialize();
  // eslint-disable-next-line no-console
  console.log('Povezava z bazo vzpostavljena.');

  const orgsRepo = dataSource.getRepository(Organization);
  const usersRepo = dataSource.getRepository(User);
  const rolesRepo = dataSource.getRepository(UserRole);

  let org = await orgsRepo.findOne({ where: { slug: 'pgd-pekre' } });
  if (!org) {
    org = await orgsRepo.save(
      orgsRepo.create({
        name: 'PGD Pekre',
        slug: 'pgd-pekre',
        city: 'Maribor',
      }),
    );
    // eslint-disable-next-line no-console
    console.log('Ustvarjeno društvo: PGD Pekre');
  }

  const email = 'admin@pgd-pekre.si';
  let admin = await usersRepo.findOne({
    where: { organizationId: org.id, email },
  });
  if (!admin) {
    admin = await usersRepo.save(
      usersRepo.create({
        organizationId: org.id,
        email,
        passwordHash: await bcrypt.hash('GasilApp123!', 12),
        firstName: 'Admin',
        lastName: 'Pekre',
      }),
    );
    await rolesRepo.save(
      rolesRepo.create({
        userId: admin.id,
        organizationId: org.id,
        role: SystemRole.ORG_ADMIN,
      }),
    );
    // eslint-disable-next-line no-console
    console.log('Ustvarjen admin: admin@pgd-pekre.si / GasilApp123!');
  } else {
    // eslint-disable-next-line no-console
    console.log('Admin že obstaja — preskočeno.');
  }

  await dataSource.destroy();
  // eslint-disable-next-line no-console
  console.log('Seed končan.');
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed napaka:', err);
  process.exit(1);
});
