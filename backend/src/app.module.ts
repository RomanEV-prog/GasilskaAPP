import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SubscriptionGuard } from './common/guards/subscription.guard';
import { GasilThrottlerGuard } from './common/guards/throttler.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { EventsModule } from './modules/events/events.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { Organization } from './modules/organizations/organization.entity';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PlatformModule } from './modules/platform/platform.module';
import { TrainingsModule } from './modules/trainings/trainings.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SpinModule } from './modules/spin/spin.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Globalni rate limit: 100 zahtev / minuto po IP (privzeto).
    // Strožje meje na Auth endpointih so v auth.controller.ts.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASS', 'postgres'),
        database: config.get<string>('DB_NAME', 'gasilapp'),
        autoLoadEntities: true,
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
        logging: config.get<string>('DB_LOGGING', 'false') === 'true',
      }),
    }),
    // Repozitorij za SubscriptionGuard, ki je registriran tu (APP_GUARD).
    TypeOrmModule.forFeature([Organization]),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    PlatformModule,
    EventsModule,
    VehiclesModule,
    TrainingsModule,
    NotificationsModule,
    EquipmentModule,
    DashboardModule,
    DocumentsModule,
    AuditModule,
    SchedulerModule,
    SpinModule,
  ],
  providers: [
    // Vrstni red je pomemben: najprej rate limit, nato avtentikacija, nato
    // vloge in nazadnje naročnina (rabi prijavljenega uporabnika).
    { provide: APP_GUARD, useClass: GasilThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Audit registriran ZA transformom = notranji interceptor —
    // njegov tap() vidi surov rezultat handlerja (z .id), ne ovitega.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
