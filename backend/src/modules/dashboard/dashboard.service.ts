import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import {
  AvailabilityStatus,
  MembershipStatus,
} from '../../common/enums/roles.enum';
import { EventRsvp } from '../events/event-rsvp.entity';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrainingsService } from '../trainings/trainings.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { VehiclesService } from '../vehicles/vehicles.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(EventRsvp)
    private readonly rsvpsRepo: Repository<EventRsvp>,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly trainingsService: TrainingsService,
    private readonly vehiclesService: VehiclesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Dashboard za vodstvo — agregati celotnega društva. */
  async adminDashboard(organizationId: string) {
    const [
      total,
      active,
      operatives,
      availableNow,
      upcomingEvents,
      expiringTrainings,
      expiringVehicles,
      availabilityBreakdown,
    ] = await Promise.all([
      this.usersRepo.count({ where: { organizationId } }),
      this.usersRepo.count({ where: { organizationId, isActive: true } }),
      this.usersRepo.count({
        where: {
          organizationId,
          isActive: true,
          membershipStatus: MembershipStatus.OPERATIVE,
        },
      }),
      this.usersRepo.count({
        where: {
          organizationId,
          isActive: true,
          availability: AvailabilityStatus.AVAILABLE,
        },
      }),
      this.eventsService.findUpcoming(organizationId, 5),
      this.trainingsService.findExpiring(organizationId, 60),
      this.vehiclesService.findExpiring(organizationId, 30),
      this.usersService.availabilityBreakdown(organizationId),
    ]);

    return {
      members: { total, active, operatives, availableNow },
      upcomingEvents,
      expiringTrainings,
      expiringVehicles,
      availabilityBreakdown,
    };
  }

  /** Dashboard za člana — samo njegovi podatki. */
  async memberDashboard(organizationId: string, userId: string) {
    const [upcomingEvents, myTrainings, myNotifications, me, myRsvps] =
      await Promise.all([
        this.eventsService.findUpcoming(organizationId, 5),
        this.trainingsService.findByUser(organizationId, userId),
        this.notificationsService.findMine(organizationId, userId),
        // Surova entiteta — beremo le `availability`, v odgovor gre samo to polje.
        this.usersService.findEntity(organizationId, userId),
        this.rsvpsRepo.find({
          where: {
            userId,
            event: {
              organizationId,
              isCancelled: false,
              startsAt: MoreThanOrEqual(new Date()),
            },
          },
          relations: { event: true },
          order: { event: { startsAt: 'ASC' } },
        }),
      ]);

    return {
      upcomingEvents,
      myTrainings,
      myNotifications: myNotifications.slice(0, 10),
      myAvailability: me.availability,
      myRsvps: myRsvps.map((r) => ({
        id: r.id,
        status: r.status,
        note: r.note,
        event: r.event
          ? {
              id: r.event.id,
              title: r.event.title,
              startsAt: r.event.startsAt,
              location: r.event.location,
            }
          : null,
      })),
    };
  }
}
