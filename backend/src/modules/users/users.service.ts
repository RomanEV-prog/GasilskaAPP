import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import {
  AvailabilityStatus,
  MembershipStatus,
  SystemRole,
} from '../../common/enums/roles.enum';
import { usernameBase } from '../../common/utils/username.util';
import { UserRole } from './user-role.entity';
import { User } from './user.entity';
import {
  CreateUserDto,
  QueryUsersDto,
  UpdateUserDto,
} from './dto/user.dto';

const BCRYPT_ROUNDS = 12;

/** User brez občutljivih polj — varno za API odgovore. */
export type SafeUser = Omit<
  User,
  'passwordHash' | 'fcmToken' | 'passwordResetToken' | 'passwordResetExpires'
> & { roles?: SystemRole[] | UserRole[] };

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly rolesRepo: Repository<UserRole>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Odstrani občutljiva polja pred vrnitvijo v API.
   * Vlogo splošči v seznam nizov, če so naložene.
   */
  sanitize(user: User): SafeUser {
    const {
      passwordHash,
      fcmToken,
      passwordResetToken,
      passwordResetExpires,
      roles,
      ...rest
    } = user;
    return {
      ...rest,
      roles: Array.isArray(roles)
        ? roles.map((r) => (r instanceof UserRole ? r.role : r))
        : undefined,
    } as SafeUser;
  }

  /**
   * Generira prijavno ime, unikatno znotraj društva:
   * "Janez Novak" → janez.novak (ob koliziji janez.novak2, janez.novak3 ...).
   */
  async generateUsername(
    organizationId: string,
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const base = usernameBase(firstName, lastName);
    let candidate = base;
    for (let i = 2; ; i++) {
      const taken = await this.usersRepo.findOne({
        where: { organizationId, username: candidate },
      });
      if (!taken) return candidate;
      candidate = `${base}${i}`;
    }
  }

  /**
   * Prepreči stopnjevanje pravic. Vlogo super_admin (platformska) ni mogoče
   * dodeliti prek uporabniškega vmesnika društva; vlogi org_admin in predsednik
   * lahko dodeli le administrator društva (ali super_admin). Ostale vloge lahko
   * dodeli vsak, ki doseže endpoint (že omejen z @Roles na vodstvo).
   *
   * `actorRoles === undefined` pomeni sistemski kontekst (npr. registracija,
   * seed) → brez preverjanja. Controller vedno posreduje vloge klicatelja.
   */
  private assertCanAssignRoles(
    actorRoles: SystemRole[] | undefined,
    requested: SystemRole[],
  ): void {
    if (actorRoles === undefined) return;
    const isSuperAdmin = actorRoles.includes(SystemRole.SUPER_ADMIN);
    const isOrgAdmin = isSuperAdmin || actorRoles.includes(SystemRole.ORG_ADMIN);
    // Funkcije (predsednik, poveljnik ...) so samo nazivi brez pravic —
    // posebej varovana je le dodelitev administratorja.
    for (const role of requested) {
      if (role === SystemRole.SUPER_ADMIN && !isSuperAdmin) {
        throw new ForbiddenException('Vloge super_admin ni mogoče dodeliti.');
      }
      if (role === SystemRole.ORG_ADMIN && !isOrgAdmin) {
        throw new ForbiddenException(
          'Vlogo administrator društva lahko dodeli le administrator društva.',
        );
      }
    }
  }

  /**
   * Ustvari uporabnika + njegove vloge znotraj organizacije.
   * Uporabljeno tako iz AuthService.register kot iz UsersController.
   * E-pošta je neobvezna; prijavno ime se generira samodejno.
   */
  async create(
    organizationId: string,
    dto: CreateUserDto,
    actorRoles?: SystemRole[],
  ): Promise<SafeUser> {
    if (dto.email) {
      const exists = await this.usersRepo.findOne({
        where: { organizationId, email: dto.email.toLowerCase() },
      });
      if (exists) {
        throw new ConflictException(
          'Uporabnik s tem e-poštnim naslovom že obstaja.',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const roles = dto.roles?.length ? dto.roles : [SystemRole.MEMBER];
    this.assertCanAssignRoles(actorRoles, roles);
    const username = await this.generateUsername(
      organizationId,
      dto.firstName,
      dto.lastName,
    );

    const user = await this.dataSource.transaction(async (manager) => {
      const created = manager.create(User, {
        organizationId,
        username,
        email: dto.email?.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        dateOfBirth: dto.dateOfBirth,
        membershipStatus: dto.membershipStatus ?? MembershipStatus.OPERATIVE,
        rank: dto.rank,
        membershipNumber: dto.membershipNumber,
        joinedAt: dto.joinedAt,
      });
      const saved = await manager.save(created);

      const roleEntities = roles.map((role) =>
        manager.create(UserRole, {
          userId: saved.id,
          organizationId,
          role,
        }),
      );
      await manager.save(roleEntities);
      saved.roles = roleEntities;
      return saved;
    });

    return this.sanitize(user);
  }

  async findAll(
    organizationId: string,
    query: QueryUsersDto = {},
  ): Promise<SafeUser[]> {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.organizationId = :organizationId', { organizationId });

    if (query.membershipStatus) {
      qb.andWhere('user.membershipStatus = :ms', {
        ms: query.membershipStatus,
      });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :active', {
        active: query.isActive === 'true',
      });
    }

    qb.orderBy('user.lastName', 'ASC').addOrderBy('user.firstName', 'ASC');
    const users = await qb.getMany();
    return users.map((u) => this.sanitize(u));
  }

  /** Vrne surov User z vlogami (za interno uporabo, npr. Auth). */
  async findEntity(
    organizationId: string,
    id: string,
  ): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id, organizationId },
      relations: { roles: true },
    });
    if (!user) {
      throw new NotFoundException('Član ni bil najden.');
    }
    return user;
  }

  async findOne(organizationId: string, id: string): Promise<SafeUser> {
    return this.sanitize(await this.findEntity(organizationId, id));
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateUserDto,
    actorRoles?: SystemRole[],
  ): Promise<SafeUser> {
    const user = await this.findEntity(organizationId, id);
    if (dto.roles) {
      this.assertCanAssignRoles(actorRoles, dto.roles);
    }

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const clash = await this.usersRepo.findOne({
        where: { organizationId, email: dto.email.toLowerCase() },
      });
      if (clash) {
        throw new ConflictException(
          'Uporabnik s tem e-poštnim naslovom že obstaja.',
        );
      }
      user.email = dto.email.toLowerCase();
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    const assignable: (keyof UpdateUserDto)[] = [
      'firstName',
      'lastName',
      'phone',
      'address',
      'city',
      'dateOfBirth',
      'membershipStatus',
      'rank',
      'membershipNumber',
      'joinedAt',
      'isActive',
    ];
    for (const key of assignable) {
      if (dto[key] !== undefined) {
        (user as any)[key] = dto[key];
      }
    }

    await this.usersRepo.save(user);

    if (dto.roles) {
      await this.rolesRepo.delete({ userId: user.id, organizationId });
      const roleEntities = dto.roles.map((role) =>
        this.rolesRepo.create({ userId: user.id, organizationId, role }),
      );
      await this.rolesRepo.save(roleEntities);
      user.roles = roleEntities;
    }

    return this.sanitize(await this.findEntity(organizationId, id));
  }

  async updateAvailability(
    organizationId: string,
    userId: string,
    availability: AvailabilityStatus,
  ): Promise<SafeUser> {
    const user = await this.findEntity(organizationId, userId);
    user.availability = availability;
    await this.usersRepo.save(user);
    return this.sanitize(user);
  }

  /** Član si sam vklopi/izklopi prejemanje SPIN obvestil. */
  async updateSpinNotifications(
    organizationId: string,
    userId: string,
    enabled: boolean,
  ): Promise<SafeUser> {
    const user = await this.findEntity(organizationId, userId);
    user.spinNotifications = enabled;
    await this.usersRepo.save(user);
    return this.sanitize(user);
  }

  /** Član si sam spremeni geslo (zahteva trenutno geslo). */
  async changePassword(
    organizationId: string,
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :userId AND user.organizationId = :organizationId', {
        userId,
        organizationId,
      })
      .getOne();
    if (!user) {
      throw new NotFoundException('Član ni bil najden.');
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Trenutno geslo ni pravilno.');
    }
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersRepo.save(user);
    return { message: 'Geslo je bilo uspešno spremenjeno.' };
  }

  /** Mehki izbris — deaktivira člana (ne izbriše podatkov). */
  async deactivate(organizationId: string, id: string): Promise<SafeUser> {
    const user = await this.findEntity(organizationId, id);
    user.isActive = false;
    await this.usersRepo.save(user);
    return this.sanitize(user);
  }

  /** Pregled razpoložljivosti — št. članov po statusu. */
  async availabilityBreakdown(
    organizationId: string,
  ): Promise<Record<string, number>> {
    const rows = await this.usersRepo
      .createQueryBuilder('user')
      .select('user.availability', 'availability')
      .addSelect('COUNT(*)', 'count')
      .where('user.organizationId = :organizationId', { organizationId })
      .andWhere('user.isActive = true')
      .groupBy('user.availability')
      .getRawMany();

    const breakdown: Record<string, number> = {};
    for (const status of Object.values(AvailabilityStatus)) {
      breakdown[status] = 0;
    }
    for (const row of rows) {
      breakdown[row.availability] = parseInt(row.count, 10);
    }
    return breakdown;
  }

  /** Dosegljivi operativci (available + operative). */
  async availableOperatives(organizationId: string): Promise<SafeUser[]> {
    const users = await this.usersRepo.find({
      where: {
        organizationId,
        isActive: true,
        availability: AvailabilityStatus.AVAILABLE,
        membershipStatus: MembershipStatus.OPERATIVE,
      },
      order: { lastName: 'ASC' },
    });
    return users.map((u) => this.sanitize(u));
  }
}
