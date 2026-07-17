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

/**
 * Strežnik (Docker) teče v UTC — čase v obvestilih je treba izpisati v
 * slovenskem času, sicer se "ob 9.00" izpiše kot "ob 7.00" (hrošč iz testiranja).
 */
const TZ = 'Europe/Ljubljana';

/** "sobota, 1. 8. 2026 ob 9.00–13.00" — za telo obvestil. */
function formatEventTime(startsAt: Date, endsAt?: Date): string {
  const date = startsAt.toLocaleDateString('sl-SI', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  const time = (d: Date) =>
    d.toLocaleTimeString('sl-SI', {
      timeZone: TZ,
      hour: 'numeric',
      minute: '2-digit',
    });
  return `${date} ob ${time(startsAt)}${endsAt ? `–${time(endsAt)}` : ''}`;
}

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

  /** Cilj obvestila: izbrani člani imajo prednost pred ciljno skupino. */
  private notificationTargeting(event: Event): {
    target: NotificationTarget;
    targetUserIds?: string[];
  } {
    if (event.targetUserIds && event.targetUserIds.length > 0) {
      return {
        target: NotificationTarget.SPECIFIC,
        targetUserIds: event.targetUserIds,
      };
    }
    return { target: this.notificationTarget(event) };
  }

  /** Preveri, da vsi navedeni člani pripadajo temu društvu. */
  private async assertUsersInOrg(
    organizationId: string,
    userIds?: string[],
  ): Promise<void> {
    const unique = [...new Set(userIds ?? [])];
    if (unique.length === 0) return;
    const validCount = await this.usersRepo.count({
      where: { id: In(unique), organizationId },
    });
    if (validCount !== unique.length) {
      throw new BadRequestException(
        'Nekateri člani ne pripadajo temu društvu.',
      );
    }
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
    await this.assertUsersInOrg(organizationId, dto.targetUserIds);
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
        body: `${formatEventTime(saved.startsAt, saved.endsAt)}${saved.location ? ` — ${saved.location}` : ''}`,
        type: 'event',
        ...this.notificationTargeting(saved),
        data: { eventId: saved.id },
      });
    }
    return saved;
  }

  /**
   * Dogodkom pripne odziv trenutnega uporabnika (`myRsvpStatus`) — da mobilna
   * in web pokažeta že oddani odziv tudi v koledarju in po ponovnem odprtju.
   */
  private async withMyRsvp(
    events: Event[],
    userId?: string,
  ): Promise<(Event & { myRsvpStatus?: string })[]> {
    if (!userId || events.length === 0) return events;
    const rsvps = await this.rsvpsRepo.find({
      where: { userId, eventId: In(events.map((e) => e.id)) },
    });
    const byEvent = new Map(rsvps.map((r) => [r.eventId, r.status]));
    return events.map((e) => ({ ...e, myRsvpStatus: byEvent.get(e.id) }));
  }

  async findAllWithMyRsvp(
    organizationId: string,
    query: QueryEventsDto = {},
    userId?: string,
  ): Promise<(Event & { myRsvpStatus?: string })[]> {
    return this.withMyRsvp(await this.findAll(organizationId, query), userId);
  }

  async findOneWithMyRsvp(
    organizationId: string,
    id: string,
    userId?: string,
  ): Promise<Event & { myRsvpStatus?: string }> {
    const event = await this.findOne(organizationId, id);
    return (await this.withMyRsvp([event], userId))[0];
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
    await this.assertUsersInOrg(organizationId, dto.targetUserIds);

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
      body: `Dogodek ${formatEventTime(saved.startsAt)} je odpovedan.`,
      type: 'event_cancelled',
      ...this.notificationTargeting(saved),
      data: { eventId: saved.id },
    });
    return saved;
  }

  /**
   * Pošlje zapadle opomnike pred dogodki (kliče scheduler). Za vsak prihajajoč
   * dogodek preveri izbrane odmike (reminderOffsets); ko je do začetka manj
   * kot odmik in ta še ni bil poslan, pošlje obvestilo udeležencem in odmik
   * zabeleži v remindersSent.
   */
  async sendDueReminders(): Promise<number> {
    const now = new Date();
    const upcoming = await this.eventsRepo.find({
      where: { isCancelled: false, startsAt: MoreThanOrEqual(now) },
    });

    let sentCount = 0;
    for (const event of upcoming) {
      const offsets = event.reminderOffsets ?? [];
      const sent = new Set(event.remindersSent ?? []);
      const due = offsets.filter(
        (o) =>
          !sent.has(o) &&
          new Date(event.startsAt.getTime() - o * 60_000) <= now,
      );
      if (due.length === 0) continue;

      await this.notificationsService.create(event.organizationId, null, {
        title: `⏰ Opomnik: ${event.title}`,
        body: `${formatEventTime(event.startsAt, event.endsAt)}${event.location ? ` — ${event.location}` : ''}`,
        type: 'event_reminder',
        ...this.notificationTargeting(event),
        data: { eventId: event.id },
      });
      // Vsi pravkar zapadli odmiki se zabeležijo naenkrat — en opomnik,
      // tudi če je bil backend nekaj časa ugasnjen in je zapadlo več odmikov.
      event.remindersSent = [...(event.remindersSent ?? []), ...due];
      await this.eventsRepo.save(event);
      sentCount++;
    }
    return sentCount;
  }

  /**
   * Trajno izbriše dogodek (skupaj z odzivi in prisotnostjo — DB kaskada).
   * Dovoljeno samo za pretekle ali odpovedane dogodke; prihodnje je treba
   * najprej odpovedati, da člani dobijo obvestilo.
   */
  async remove(organizationId: string, id: string): Promise<{ message: string }> {
    const event = await this.findOne(organizationId, id);
    const ended = event.endsAt ?? event.startsAt;
    if (!event.isCancelled && ended > new Date()) {
      throw new BadRequestException(
        'Izbrišeš lahko samo pretekle ali odpovedane dogodke.',
      );
    }
    await this.eventsRepo.remove(event);
    return { message: 'Dogodek je bil izbrisan.' };
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
