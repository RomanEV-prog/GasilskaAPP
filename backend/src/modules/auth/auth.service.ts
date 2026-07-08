import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { SystemRole } from '../../common/enums/roles.enum';
import { usernameBase } from '../../common/utils/username.util';
import { Organization } from '../organizations/organization.entity';
import { UserRole } from '../users/user-role.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { RegistrationCode } from './registration-code.entity';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { randomBytes } from 'crypto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
    @InjectRepository(RegistrationCode)
    private readonly codesRepo: Repository<RegistrationCode>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // Dostopni žeton je kratkoživ; refresh žeton dolgoživ in podpisan z ločeno skrivnostjo.
  private get accessExpires(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRES', '1h');
  }
  private get refreshExpires(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRES', '30d');
  }
  private get refreshSecret(): string {
    return (
      this.config.get<string>('JWT_REFRESH_SECRET') ||
      `${this.config.get<string>('JWT_SECRET')}-refresh`
    );
  }

  private signAccessToken(user: User, roles: string[]): string {
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      username: user.username,
      email: user.email,
      roles,
    };
    return this.jwtService.sign(payload, { expiresIn: this.accessExpires });
  }

  private signRefreshToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { secret: this.refreshSecret, expiresIn: this.refreshExpires },
    );
  }

  private buildAuthResponse(user: User, roles: string[]) {
    return {
      accessToken: this.signAccessToken(user, roles),
      refreshToken: this.signRefreshToken(user),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        roles,
      },
    };
  }

  /**
   * Zamenja veljaven refresh žeton za nov par (rotacija).
   * Refresh žeton je podpisan z ločeno skrivnostjo in nima vlog/organizacije,
   * zato ga ni mogoče uporabiti kot dostopni žeton.
   */
  async refresh(refreshToken: string) {
    let decoded: { sub?: string; type?: string };
    try {
      decoded = this.jwtService.verify(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh žeton je neveljaven ali je potekel.',
      );
    }
    if (decoded.type !== 'refresh' || !decoded.sub) {
      throw new UnauthorizedException('Neveljaven refresh žeton.');
    }

    const user = await this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.id = :id', { id: decoded.sub })
      .getOne();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Uporabnik ni na voljo.');
    }

    const roles = (user.roles ?? []).map((r) => r.role);
    return this.buildAuthResponse(user, roles);
  }

  /** Javni seznam društev — za izbiro ob prijavi (samo id in ime). */
  async publicOrganizations(): Promise<{ id: string; name: string }[]> {
    const orgs = await this.orgsRepo.find({
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
    return orgs.map((o) => ({ id: o.id, name: o.name }));
  }

  /**
   * Prijava — z uporabniškim imenom znotraj društva (username + organizationId)
   * ali z e-pošto (vsebuje '@', globalno). Preveri geslo in vrne JWT.
   */
  async login(dto: LoginDto) {
    const identifier = dto.username.toLowerCase().trim();

    const qb = this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role');

    if (identifier.includes('@')) {
      qb.where('user.email = :identifier', { identifier });
    } else {
      if (!dto.organizationId) {
        throw new BadRequestException('Izberite svoje društvo.');
      }
      qb.where(
        'user.username = :identifier AND user.organizationId = :orgId',
        { identifier, orgId: dto.organizationId },
      );
    }
    const user = await qb.getOne();

    if (!user) {
      throw new UnauthorizedException('Napačno uporabniško ime ali geslo.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Vaš račun je deaktiviran.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Napačno uporabniško ime ali geslo.');
    }

    user.lastLoginAt = new Date();
    await this.usersRepo.update(user.id, { lastLoginAt: user.lastLoginAt });

    const roles = (user.roles ?? []).map((r) => r.role);
    return this.buildAuthResponse(user, roles);
  }

  /**
   * Izda nove aktivacijske kode za registracijo društev.
   * Kliče se prek zaščitenega endpointa (master ključ) — glej AuthController.
   */
  async createRegistrationCodes(
    count = 1,
    note?: string,
  ): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      // Berljiva oblika: GASIL-XXXX-XXXX (brez dvoumnih znakov).
      const raw = randomBytes(8)
        .toString('base64url')
        .replace(/[-_]/g, '')
        .toUpperCase()
        .slice(0, 8);
      const code = `GASIL-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
      await this.codesRepo.save(this.codesRepo.create({ code, note }));
      codes.push(code);
    }
    return codes;
  }

  /**
   * Registracija novega društva — zahteva veljavno (še neporabljeno)
   * aktivacijsko kodo; ustvari organizacijo + org_admin. Vse v eni transakciji.
   */
  async register(dto: RegisterDto) {
    const slug = dto.organizationSlug.toLowerCase();
    const email = dto.email.toLowerCase();

    const slugTaken = await this.orgsRepo.findOne({ where: { slug } });
    if (slugTaken) {
      throw new ConflictException('Društvo s to oznako že obstaja.');
    }

    const code = await this.codesRepo.findOne({
      where: { code: dto.activationCode.trim().toUpperCase() },
    });
    if (!code || code.usedAt) {
      throw new UnauthorizedException(
        'Aktivacijska koda je neveljavna ali že porabljena. Za kodo nas kontaktirajte.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const { user, roles } = await this.dataSource.transaction(
      async (manager) => {
        const org = manager.create(Organization, {
          name: dto.organizationName,
          slug,
        });
        const savedOrg = await manager.save(org);

        // Porabi aktivacijsko kodo (znotraj iste transakcije).
        await manager.update(RegistrationCode, code.id, {
          usedAt: new Date(),
          usedByOrganizationId: savedOrg.id,
        });

        const newUser = manager.create(User, {
          organizationId: savedOrg.id,
          // Novo društvo → osnova imena je vedno prosta.
          username: usernameBase(dto.firstName, dto.lastName),
          email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        });
        const savedUser = await manager.save(newUser);

        // Prvi uporabnik društva je org_admin.
        const roleEntity = manager.create(UserRole, {
          userId: savedUser.id,
          organizationId: savedOrg.id,
          role: SystemRole.ORG_ADMIN,
        });
        await manager.save(roleEntity);

        return { user: savedUser, roles: [SystemRole.ORG_ADMIN as string] };
      },
    );

    return this.buildAuthResponse(user, roles);
  }

  /** Posodobi FCM žeton prijavljenega uporabnika. */
  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.usersRepo.update(userId, { fcmToken });
  }

  /**
   * Ustvari reset žeton. (MVP: vrne žeton; pošiljanje e-pošte pride pozneje.)
   * Za neobstoječ e-mail namerno ne razkrijemo napake.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (user) {
      const token = await bcrypt.hash(`${user.id}:${Date.now()}`, 10);
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await this.usersRepo.update(user.id, {
        passwordResetToken: token,
        passwordResetExpires: expires,
      });
      // TODO: pošlji e-pošto z reset povezavo (Notifications modul).
    }
    return {
      message:
        'Če račun obstaja, smo poslali navodila za ponastavitev gesla.',
    };
  }

  /** Nastavi novo geslo na podlagi reset žetona. */
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordResetToken')
      .addSelect('user.passwordResetExpires')
      .where('user.passwordResetToken = :token', { token })
      .getOne();

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Žeton za ponastavitev je neveljaven ali potekel.');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.usersRepo.update(user.id, {
      passwordHash,
      passwordResetToken: () => 'NULL',
      passwordResetExpires: () => 'NULL',
    });
    return { message: 'Geslo je bilo uspešno posodobljeno.' };
  }
}
