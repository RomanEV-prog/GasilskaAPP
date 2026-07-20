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
  MEMBER_DIRECTORY_ROLES,
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

/**
 * Minimalna projekcija člana za navadne člane (feedback Darjan, 20. 7. 2026).
 * Brez telefona, e-pošte, naslova, datuma rojstva in vlog.
 */
export type PublicUser = Pick<
  User,
  'id' | 'firstName' | 'lastName' | 'username' | 'membershipStatus' | 'isActive'
>;

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
   * Skrči člana na javna polja. Uporabi se, kadar poizvedbo izvaja
   * nekdo brez pravice do imenika — meja je strežniška, ne v vmesniku,
   * ker bi bili podatki sicer vidni v omrežnem prometu.
   */
  publicProjection(user: User): PublicUser {
    const { id, firstName, lastName, username, membershipStatus, isActive } =
      user;
    return { id, firstName, lastName, username, membershipStatus, isActive };
  }

  /** Ali klicatelj sme videti polne osebne podatke sočlanov? */
  private canSeeFullProfile(actorRoles: SystemRole[] = []): boolean {
    return actorRoles.some((r) => MEMBER_DIRECTORY_ROLES.includes(r));
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
    actorRoles?: SystemRole[],
  ): Promise<SafeUser[] | PublicUser[]> {
    const full = this.canSeeFullProfile(actorRoles);
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .where('user.organizationId = :organizationId', { organizationId });

    // Vloge nalagamo samo, kadar jih klicatelj sme videti — sicer odveč join.
    if (full) {
      qb.leftJoinAndSelect('user.roles', 'role');
    }

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
    return full
      ? users.map((u) => this.sanitize(u))
      : users.map((u) => this.publicProjection(u));
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

  /**
   * Profil člana. Poln le za upravljavce imenika ali kadar član gleda sebe;
   * sicer skrčen (brez tega bi bila omejitev na `findAll` zaobidena z enim klicem).
   */
  async findOne(
    organizationId: string,
    id: string,
    actorRoles?: SystemRole[],
    actorId?: string,
  ): Promise<SafeUser | PublicUser> {
    const user = await this.findEntity(organizationId, id);
    const full =
      actorRoles === undefined || // sistemski klic (seed, interno)
      this.canSeeFullProfile(actorRoles) ||
      (actorId !== undefined && actorId === id);
    return full ? this.sanitize(user) : this.publicProjection(user);
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
  async availableOperatives(
    organizationId: string,
    actorRoles?: SystemRole[],
  ): Promise<SafeUser[] | PublicUser[]> {
    const users = await this.usersRepo.find({
      where: {
        organizationId,
        isActive: true,
        availability: AvailabilityStatus.AVAILABLE,
        membershipStatus: MembershipStatus.OPERATIVE,
      },
      order: { lastName: 'ASC' },
    });
    // Tudi ta seznam je puščal telefon in naslov vsem prijavljenim.
    return this.canSeeFullProfile(actorRoles)
      ? users.map((u) => this.sanitize(u))
      : users.map((u) => this.publicProjection(u));
  }
}
