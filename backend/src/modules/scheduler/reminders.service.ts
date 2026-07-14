import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemRole } from '../../common/enums/roles.enum';
import { EquipmentService } from '../equipment/equipment.service';
import { NotificationTarget } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Organization } from '../organizations/organization.entity';
import { Training } from '../trainings/training.entity';
import { TrainingsService } from '../trainings/trainings.service';
import { VehiclesService } from '../vehicles/vehicles.service';

/** Usposabljanja: enkraten opomnik vodstvu 30 dni pred iztekom. */
const TRAINING_REMINDER_DAYS = 30;

/**
 * Roki vozil in pregledi opreme: opomnik na točno toliko dni pred iztekom
 * (predlog PGD Pekre: teden prej in še 3 dni prej). Ker se pošlje samo na
 * točen dan, ni vsakodnevnega ponavljanja in ni potreben "poslano" zaznamek.
 */
const DEADLINE_REMINDER_DAYS = [7, 3];

/** Prejemniki opomnikov za roke vozil: administratorji + glavni strojnik. */
const VEHICLE_REMINDER_ROLES: SystemRole[] = [
  SystemRole.ORG_ADMIN,
  SystemRole.CHIEF_MACHINIST,
];

/**
 * Prejemniki opomnikov za preglede opreme: administratorji, glavni strojnik,
 * orodjar (vrvna tehnika ipd.) in pomočnik za zaščito dihal (IDA).
 */
const EQUIPMENT_REMINDER_ROLES: SystemRole[] = [
  SystemRole.ORG_ADMIN,
  SystemRole.CHIEF_MACHINIST,
  SystemRole.TOOLKEEPER,
  SystemRole.ASSISTANT_BREATHING_APPARATUS,
];

/** Datum (YYYY-MM-DD) čez `days` dni — za primerjavo z DATE stolpci. */
function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Dnevni opomniki (MODULES.md): vsak dan ob 08:00 preveri
 * potekajoče roke vozil, preglede opreme in usposabljanja.
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
    @InjectRepository(Training)
    private readonly trainingsRepo: Repository<Training>,
    private readonly vehiclesService: VehiclesService,
    private readonly trainingsService: TrainingsService,
    private readonly equipmentService: EquipmentService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *')
  async runDailyChecks(): Promise<void> {
    this.logger.log('Dnevni pregled potekajočih rokov ...');
    const orgs = await this.orgsRepo.find({ where: { isActive: true } });
    for (const org of orgs) {
      try {
        await this.checkVehicles(org.id);
        await this.checkEquipment(org.id);
        await this.checkTrainings(org.id);
      } catch (err) {
        this.logger.error(
          `Opomniki za ${org.slug} niso uspeli: ${(err as Error).message}`,
        );
      }
    }
    this.logger.log('Dnevni pregled končan.');
  }

  /**
   * Roki vozil (registracija, zavarovanje, servis): opomnik na točno
   * 7 in 3 dni pred iztekom → administratorji + glavni strojnik.
   */
  private async checkVehicles(organizationId: string): Promise<void> {
    const maxDays = Math.max(...DEADLINE_REMINDER_DAYS);
    const vehicles = await this.vehiclesService.findExpiring(
      organizationId,
      maxDays,
    );

    for (const days of DEADLINE_REMINDER_DAYS) {
      const onDate = isoInDays(days);
      const lines = vehicles
        .map((v) => {
          const due = [
            v.registrationExpires === onDate && 'registracija',
            v.insuranceExpires === onDate && 'zavarovanje',
            v.serviceDue === onDate && 'servis',
          ].filter(Boolean);
          return due.length > 0 ? `${v.name}: ${due.join(', ')}` : null;
        })
        .filter((l): l is string => l !== null);
      if (lines.length === 0) continue;

      await this.notificationsService.createForRoles(
        organizationId,
        VEHICLE_REMINDER_ROLES,
        {
          title: `🚒 Roki vozil potečejo čez ${days} dni`,
          body: lines.join('\n'),
          type: 'vehicle_reminder',
        },
      );
    }
  }

  /**
   * Pregledi opreme (IDA, vrvna tehnika, gasilni aparati ...): opomnik na
   * točno 7 in 3 dni pred rokom → administratorji, glavni strojnik, orodjar,
   * pomočnik za zaščito dihal.
   */
  private async checkEquipment(organizationId: string): Promise<void> {
    const maxDays = Math.max(...DEADLINE_REMINDER_DAYS);
    const equipment = await this.equipmentService.findInspectionsDue(
      organizationId,
      maxDays,
    );

    for (const days of DEADLINE_REMINDER_DAYS) {
      const onDate = isoInDays(days);
      const due = equipment.filter((e) => e.nextInspection === onDate);
      if (due.length === 0) continue;

      const lines = due.map((e) =>
        [
          e.name,
          e.category && `(${e.category})`,
          e.vehicle?.name && `— vozilo ${e.vehicle.name}`,
        ]
          .filter(Boolean)
          .join(' '),
      );
      await this.notificationsService.createForRoles(
        organizationId,
        EQUIPMENT_REMINDER_ROLES,
        {
          title: `🧰 Pregled opreme čez ${days} dni (${due.length})`,
          body: lines.join('\n'),
          type: 'equipment_reminder',
        },
      );
    }
  }

  private async checkTrainings(organizationId: string): Promise<void> {
    // Samo tista, za katera opomnik še ni bil poslan.
    const expiring = (
      await this.trainingsService.findExpiring(
        organizationId,
        TRAINING_REMINDER_DAYS,
      )
    ).filter((t) => !t.reminderSent);
    if (expiring.length === 0) {
      return;
    }
    const lines = expiring.map(
      (t) =>
        `${t.user ? `${t.user.firstName} ${t.user.lastName}: ` : ''}${t.name} (poteče ${t.expiresAt})`,
    );
    await this.notificationsService.create(organizationId, null, {
      title: `Potekajoča usposabljanja (${expiring.length})`,
      body: lines.join('\n'),
      type: 'training_reminder',
      target: NotificationTarget.LEADERSHIP,
    });
    await this.trainingsRepo.update(
      expiring.map((t) => t.id),
      { reminderSent: true },
    );
  }
}
