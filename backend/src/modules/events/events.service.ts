import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { MembershipStatus } from '../../common/enums/roles.enum';
import { NotificationTarget } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';
import { EventAttendance } from './event-attendance.entity';
import { EventRsvp } from './event-rsvp.entity';
import { Event } from './event.entity';
import {
  CreateEventDto,
  MarkAttendanceDto,
  QueryEventsDto,
  RsvpDto,
  UpdateEventDto,
} from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepo: Repository<Event>,
    @InjectRepository(EventRsvp)
    private readonly rsvpsRepo: Repository<EventRsvp>,
    @InjectRepository(EventAttendance)
    private readonly attendanceRepo: Repository<EventAttendance>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Ciljna skupina obvestila glede na targetGroup dogodka. */
  private notificationTarget(event: Event): NotificationTarget {
    const groups = event.targetGroup ?? [];
    if (groups.length === 1 && groups[0] === MembershipStatus.OPERATIVE) {
      return NotificationTarget.OPERATIVE;
    }
    if (groups.length === 1 && groups[0] === MembershipStatus.YOUTH) {
      return NotificationTarget.YOUTH;
    }
    return NotificationTarget.ALL;
  }

  async create(
    organizationId: string,
    createdBy: string,
    dto: CreateEventDto,
  ): Promise<Event> {
    if (dto.endsAt && new Date(dto.endsAt) < new Date(dto.startsAt)) {
      throw new BadRequestException(
        'Konec dogodka ne more biti pred začetkom.',
      );
    }
    const event = this.eventsRepo.create({
      ...dto,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      organizationId,
      createdBy,
    });
    const saved = await this.eventsRepo.save(event);

    if (saved.sendNotification) {
      await this.notificationsService.create(organizationId, createdBy, {
        title: `Nov dogodek: ${saved.title}`,
        body: `${saved.startsAt.toLocaleString('sl-SI')}${saved.location ? ` — ${saved.location}` : ''}`,
        type: 'event',
        target: this.notificationTarget(saved),
        data: { eventId: saved.id },
      });
    }
    return saved;
  }

  async findAll(
    organizationId: string,
    query: QueryEventsDto = {},
  ): Promise<Event[]> {
    const qb = this.eventsRepo
      .createQueryBuilder('event')
      .where('event.organizationId = :organizationId', { organizationId });

    if (query.eventType) {
      qb.andWhere('event.eventType = :type', { type: query.eventType });
    }
    if (query.from) {
      qb.andWhere('event.startsAt >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('event.startsAt <= :to', { to: query.to });
    }
    if (query.includeCancelled !== 'true') {
      qb.andWhere('event.isCancelled = false');
    }

    return qb.orderBy('event.startsAt', 'ASC').getMany();
  }

  /** Prihajajoči dogodki — za dashboard. */
  async findUpcoming(organizationId: string, limit = 5): Promise<Event[]> {
    return this.eventsRepo.find({
      where: {
        organizationId,
        isCancelled: false,
        startsAt: MoreThanOrEqual(new Date()),
      },
      order: { startsAt: 'ASC' },
      take: limit,
    });
  }

  async findOne(organizationId: string, id: string): Promise<Event> {
    const event = await this.eventsRepo.findOne({
      where: { id, organizationId },
    });
    if (!event) {
      throw new NotFoundException('Dogodek ni bil najden.');
    }
    return event;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateEventDto,
  ): Promise<Event> {
    const event = await this.findOne(organizationId, id);

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : event.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : event.endsAt;
    if (endsAt && endsAt < startsAt) {
      throw new BadRequestException(
        'Konec dogodka ne more biti pred začetkom.',
      );
    }

    Object.assign(event, {
      ...dto,
      startsAt,
      endsAt,
    });
    return this.eventsRepo.save(event);
  }

  async cancel(organizationId: string, id: string): Promise<Event> {
    const event = await this.findOne(organizationId, id);
    event.isCancelled = true;
    const saved = await this.eventsRepo.save(event);

    await this.notificationsService.create(organizationId, null, {
      title: `Odpovedan dogodek: ${saved.title}`,
      body: `Dogodek ${saved.startsAt.toLocaleString('sl-SI')} je odpovedan.`,
      type: 'event_cancelled',
      target: this.notificationTarget(saved),
      data: { eventId: saved.id },
    });
    return saved;
  }

  /** Potrdi/posodobi udeležbo prijavljenega uporabnika (upsert). */
  async rsvp(
    organizationId: string,
    eventId: string,
    userId: string,
    dto: RsvpDto,
  ): Promise<EventRsvp> {
    const event = await this.findOne(organizationId, eventId);
    if (event.isCancelled) {
      throw new BadRequestException('Dogodek je odpovedan.');
    }
    if (!event.requiresRsvp) {
      throw new BadRequestException('Dogodek ne zahteva prijave udeležbe.');
    }

    let rsvp = await this.rsvpsRepo.findOne({ where: { eventId, userId } });
    if (rsvp) {
      rsvp.status = dto.status;
      rsvp.note = dto.note;
    } else {
      rsvp = this.rsvpsRepo.create({ eventId, userId, ...dto });
    }
    return this.rsvpsRepo.save(rsvp);
  }

  /** Odzivi na dogodek — za vodstvo. */
  async getRsvps(organizationId: string, eventId: string) {
    await this.findOne(organizationId, eventId); // preveri tenant + obstoj
    const rsvps = await this.rsvpsRepo.find({
      where: { eventId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    return rsvps.map((r) => ({
      id: r.id,
      status: r.status,
      note: r.note,
      updatedAt: r.updatedAt,
      user: r.user
        ? {
            id: r.user.id,
            firstName: r.user.firstName,
            lastName: r.user.lastName,
            membershipStatus: r.user.membershipStatus,
          }
        : null,
    }));
  }

  /** Označi prisotnost za več članov naenkrat (upsert po (event, user)). */
  async markAttendance(
    organizationId: string,
    eventId: string,
    markedBy: string,
    dto: MarkAttendanceDto,
  ) {
    await this.findOne(organizationId, eventId);

    // Preveri, da vsi navedeni člani pripadajo temu društvu (prepreči
    // vpis prisotnosti za uporabnika drugega društva prek ponarejenega userId).
    const userIds = [...new Set(dto.entries.map((e) => e.userId))];
    if (userIds.length > 0) {
      const validCount = await this.usersRepo.count({
        where: { id: In(userIds), organizationId },
      });
      if (validCount !== userIds.length) {
        throw new BadRequestException(
          'Nekateri člani ne pripadajo temu društvu.',
        );
      }
    }

    const results: EventAttendance[] = [];
    for (const entry of dto.entries) {
      let att = await this.attendanceRepo.findOne({
        where: { eventId, userId: entry.userId },
      });
      if (att) {
        att.present = entry.present;
        att.markedBy = markedBy;
      } else {
        att = this.attendanceRepo.create({
          eventId,
          userId: entry.userId,
          present: entry.present,
          markedBy,
        });
      }
      results.push(await this.attendanceRepo.save(att));
    }
    return results;
  }
}
