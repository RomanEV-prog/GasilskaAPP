import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTarget } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Organization } from '../organizations/organization.entity';
import { Training } from '../trainings/training.entity';
import { TrainingsService } from '../trainings/trainings.service';
import { VehiclesService } from '../vehicles/vehicles.service';

const REMINDER_DAYS = 30;

/**
 * Dnevni opomniki (MODULES.md): vsak dan ob 08:00 preveri
 * potekajoče roke vozil in usposabljanj ter obvesti vodstvo.
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
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *')
  async runDailyChecks(): Promise<void> {
    this.logger.log('Dnevni pregled potekajočih rokov ...');
    const orgs = await this.orgsRepo.find({ where: { isActive: true } });
    for (const org of orgs) {
      try {
        await this.checkVehicles(org.id);
        await this.checkTrainings(org.id);
      } catch (err) {
        this.logger.error(
          `Opomniki za ${org.slug} niso uspeli: ${(err as Error).message}`,
        );
      }
    }
    this.logger.log('Dnevni pregled končan.');
  }

  private async checkVehicles(organizationId: string): Promise<void> {
    const vehicles = await this.vehiclesService.findExpiring(
      organizationId,
      REMINDER_DAYS,
    );
    if (vehicles.length === 0) {
      return;
    }
    const lines = vehicles.map((v) => {
      const dates = [
        v.registrationExpires && `registracija: ${v.registrationExpires}`,
        v.insuranceExpires && `zavarovanje: ${v.insuranceExpires}`,
        v.serviceDue && `servis: ${v.serviceDue}`,
      ]
        .filter(Boolean)
        .join(', ');
      return `${v.name} (${dates})`;
    });
    await this.notificationsService.create(organizationId, null, {
      title: `Vozila s potekajočimi roki (${vehicles.length})`,
      body: lines.join('\n'),
      type: 'vehicle_reminder',
      target: NotificationTarget.LEADERSHIP,
    });
  }

  private async checkTrainings(organizationId: string): Promise<void> {
    // Samo tista, za katera opomnik še ni bil poslan.
    const expiring = (
      await this.trainingsService.findExpiring(organizationId, REMINDER_DAYS)
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
