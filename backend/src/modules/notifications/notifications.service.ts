import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  MembershipStatus,
  SystemRole,
} from '../../common/enums/roles.enum';
import { User } from '../users/user.entity';
import { FirebaseService } from './firebase.service';
import { NotificationRead } from './notification-read.entity';
import { Notification, NotificationTarget } from './notification.entity';
import { CreateNotificationDto } from './dto/notification.dto';

/** Vloge, ki štejejo kot "vodstvo" pri ciljanju obvestil. */
const LEADERSHIP_ROLES: SystemRole[] = [
  SystemRole.ORG_ADMIN,
  SystemRole.PRESIDENT,
  SystemRole.COMMANDER,
  SystemRole.DEPUTY_COMMANDER,
  SystemRole.SECRETARY,
  SystemRole.TREASURER,
  SystemRole.YOUTH_MENTOR,
];

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(NotificationRead)
    private readonly readsRepo: Repository<NotificationRead>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly firebaseService: FirebaseService,
  ) {}

  /** Razreši prejemnike glede na ciljno skupino. */
  private async resolveRecipients(
    organizationId: string,
    notification: Notification,
  ): Promise<User[]> {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.fcmToken')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.organizationId = :organizationId', { organizationId })
      .andWhere('user.isActive = true');

    // SPIN obvestila prejmejo samo uporabniki, ki jih niso izklopili.
    if (notification.type === 'spin') {
      qb.andWhere('user.spinNotifications = true');
    }

    switch (notification.target) {
      case NotificationTarget.OPERATIVE:
        qb.andWhere('user.membershipStatus = :ms', {
          ms: MembershipStatus.OPERATIVE,
        });
        break;
      case NotificationTarget.YOUTH:
        qb.andWhere('user.membershipStatus = :ms', {
          ms: MembershipStatus.YOUTH,
        });
        break;
      case NotificationTarget.LEADERSHIP:
        qb.andWhere('role.role IN (:...roles)', { roles: LEADERSHIP_ROLES });
        break;
      case NotificationTarget.SPECIFIC:
        qb.andWhere('user.id IN (:...ids)', {
          ids: notification.targetUserIds ?? [],
        });
        break;
      // ALL: brez dodatnega filtra
    }
    return qb.getMany();
  }

  /**
   * Ustvari obvestilo in ga pošlje preko FCM.
   * Uporabljajo tudi drugi moduli (npr. Events ob ustvarjanju/odpovedi).
   */
  async create(
    organizationId: string,
    createdBy: string | null,
    dto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationsRepo.create({
      ...dto,
      target: dto.target ?? NotificationTarget.ALL,
      organizationId,
      createdBy: createdBy ?? undefined,
    });
    await this.notificationsRepo.save(notification);

    const recipients = await this.resolveRecipients(
      organizationId,
      notification,
    );
    const tokens = recipients
      .map((u) => u.fcmToken)
      .filter((t): t is string => !!t);
    const { invalidTokens } = await this.firebaseService.sendToTokens(
      tokens,
      notification.title,
      notification.body,
      { notificationId: notification.id, type: notification.type },
    );

    // Počisti neveljavne (odjavljene) FCM žetone iz uporabnikov.
    if (invalidTokens.length > 0) {
      await this.usersRepo
        .createQueryBuilder()
        .update()
        .set({ fcmToken: () => 'NULL' })
        .where('fcm_token IN (:...tokens)', { tokens: invalidTokens })
        .execute();
    }

    notification.sentAt = new Date();
    return this.notificationsRepo.save(notification);
  }

  /**
   * Ustvari obvestilo, ciljano na aktivne člane z navedenimi vlogami
   * (npr. opomniki o rokih → administratorji + glavni strojnik).
   * Brez prejemnikov ne ustvari ničesar in vrne null.
   */
  async createForRoles(
    organizationId: string,
    roles: SystemRole[],
    dto: Omit<CreateNotificationDto, 'target' | 'targetUserIds'>,
  ): Promise<Notification | null> {
    const users = await this.usersRepo
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role', 'role.role IN (:...roles)', { roles })
      .where('user.organizationId = :organizationId', { organizationId })
      .andWhere('user.isActive = true')
      .getMany();
    if (users.length === 0) return null;
    return this.create(organizationId, null, {
      ...dto,
      target: NotificationTarget.SPECIFIC,
      targetUserIds: [...new Set(users.map((u) => u.id))],
    });
  }

  /** Moja obvestila — filtrirana po ciljni skupini + status prebranosti. */
  async findMine(organizationId: string, userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, organizationId },
      relations: { roles: true },
    });
    if (!user) {
      throw new NotFoundException('Uporabnik ni bil najden.');
    }
    const userRoles = (user.roles ?? []).map((r) => r.role);
    const isLeadership = userRoles.some((r) => LEADERSHIP_ROLES.includes(r));

    const all = await this.notificationsRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const mine = all.filter((n) => {
      // Kdor je SPIN obvestila izklopil, jih ne vidi niti v seznamu.
      if (n.type === 'spin' && !user.spinNotifications) {
        return false;
      }
      switch (n.target) {
        case NotificationTarget.ALL:
          return true;
        case NotificationTarget.OPERATIVE:
          return user.membershipStatus === MembershipStatus.OPERATIVE;
        case NotificationTarget.YOUTH:
          return user.membershipStatus === MembershipStatus.YOUTH;
        case NotificationTarget.LEADERSHIP:
          return isLeadership;
        case NotificationTarget.SPECIFIC:
          return (n.targetUserIds ?? []).includes(userId);
        default:
          return false;
      }
    });

    const reads = await this.readsRepo.find({
      where: { userId, notificationId: In(mine.map((n) => n.id)) },
    });
    const readIds = new Set(reads.map((r) => r.notificationId));

    return mine.map((n) => ({ ...n, isRead: readIds.has(n.id) }));
  }

  /** Vsa obvestila organizacije — za vodstvo. */
  async findAll(organizationId: string): Promise<Notification[]> {
    return this.notificationsRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  private async findOne(
    organizationId: string,
    id: string,
  ): Promise<Notification> {
    const notification = await this.notificationsRepo.findOne({
      where: { id, organizationId },
    });
    if (!notification) {
      throw new NotFoundException('Obvestilo ni bilo najdeno.');
    }
    return notification;
  }

  /** Označi obvestilo kot prebrano (idempotentno). */
  async markRead(
    organizationId: string,
    notificationId: string,
    userId: string,
  ): Promise<NotificationRead> {
    await this.findOne(organizationId, notificationId);

    const existing = await this.readsRepo.findOne({
      where: { notificationId, userId },
    });
    if (existing) {
      return existing;
    }
    const read = this.readsRepo.create({ notificationId, userId });
    return this.readsRepo.save(read);
  }

  /** Kdo je prebral obvestilo — za vodstvo. */
  async getReads(organizationId: string, notificationId: string) {
    await this.findOne(organizationId, notificationId);
    const reads = await this.readsRepo.find({
      where: { notificationId },
      relations: { user: true },
      order: { readAt: 'ASC' },
    });
    return reads.map((r) => ({
      readAt: r.readAt,
      user: r.user
        ? {
            id: r.user.id,
            firstName: r.user.firstName,
            lastName: r.user.lastName,
          }
        : null,
    }));
  }
}
