import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { toDataURL } from 'qrcode';
import {
  buildOtpauthUri,
  generateTotpSecret,
  verifyTotpCode,
} from './totp.util';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SystemRole } from '../../common/enums/roles.enum';
import { usernameBase } from '../../common/utils/username.util';
import { Organization } from '../organizations/organization.entity';
import { UserRole } from '../users/user-role.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { RegistrationCode } from './registration-code.entity';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { addMonths } from '../../common/utils/subscription.util';

const BCRYPT_ROUNDS = 12;

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

/** Rezervna koda oblike XXXX-XXXX (brez dvoumnih znakov). */
function generateBackupCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

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

  // Dostopni žeton je kratkoživ; refresh žeton dolgoživ in podpisan z ločeno
  // skrivnostjo. Env vrednosti so nizi oblike '1h'/'30d' — novi jsonwebtoken
  // tipi zahtevajo ms.StringValue, zato ozka pretvorba tipa.
  private get accessExpires(): JwtSignOptions['expiresIn'] {
    return this.config.get<string>(
      'JWT_ACCESS_EXPIRES',
      '1h',
    ) as JwtSignOptions['expiresIn'];
  }
  private get refreshExpires(): JwtSignOptions['expiresIn'] {
    return this.config.get<string>(
      'JWT_REFRESH_EXPIRES',
      '30d',
    ) as JwtSignOptions['expiresIn'];
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
      // v = token_version: sprememba gesla/2FA razveljavi vse izdane refresh
      // žetone naenkrat (odjava z vseh naprav).
      { sub: user.id, type: 'refresh', v: user.tokenVersion ?? 0 },
      { secret: this.refreshSecret, expiresIn: this.refreshExpires },
    );
  }

  /** Kratkoživ vmesni žeton med geslom in TOTP kodo (drugi korak prijave). */
  private signPendingToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, type: '2fa' },
      { secret: this.refreshSecret, expiresIn: '5m' },
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
    let decoded: { sub?: string; type?: string; v?: number };
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

    // Starejši žetoni brez `v` se štejejo kot verzija 0 (izdani pred uvedbo).
    if ((decoded.v ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException(
        'Seja je bila preklicana. Prijavite se znova.',
      );
    }

    const roles = (user.roles ?? []).map((r) => r.role);
    return this.buildAuthResponse(user, roles);
  }

  /** Javni seznam društev — za izbiro ob prijavi (samo id in ime). */
  async publicOrganizations(): Promise<{ id: string; name: string }[]> {
    const orgs = await this.orgsRepo.find({
      select: { id: true, name: true },
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
      .addSelect('user.totpSecret')
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

    // 2FA: geslo je pravilno, a polni žetoni se izdajo šele po TOTP kodi.
    if (user.totpEnabledAt && user.totpSecret) {
      return {
        requires2fa: true as const,
        pendingToken: this.signPendingToken(user),
      };
    }

    user.lastLoginAt = new Date();
    await this.usersRepo.update(user.id, { lastLoginAt: user.lastLoginAt });

    const roles = (user.roles ?? []).map((r) => r.role);
    return this.buildAuthResponse(user, roles);
  }

  /**
   * Drugi korak prijave: vmesni žeton + TOTP koda (ali rezervna koda)
   * → polni par žetonov.
   */
  async verify2fa(pendingToken: string, code: string) {
    let decoded: { sub?: string; type?: string };
    try {
      decoded = this.jwtService.verify(pendingToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Prijava je potekla. Začnite znova z geslom.',
      );
    }
    if (decoded.type !== '2fa' || !decoded.sub) {
      throw new UnauthorizedException('Neveljaven žeton.');
    }

    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.totpSecret')
      .addSelect('user.totpBackupCodes')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.id = :id', { id: decoded.sub })
      .getOne();

    if (!user || !user.isActive || !user.totpEnabledAt || !user.totpSecret) {
      throw new UnauthorizedException('Uporabnik ni na voljo.');
    }

    const ok = await this.consumeSecondFactor(user, code);
    if (!ok) {
      throw new UnauthorizedException('Napačna koda. Poskusite znova.');
    }

    user.lastLoginAt = new Date();
    await this.usersRepo.update(user.id, { lastLoginAt: user.lastLoginAt });

    const roles = (user.roles ?? []).map((r) => r.role);
    return this.buildAuthResponse(user, roles);
  }

  /**
   * Preveri TOTP kodo; če ne ustreza, poskusi še enkratno rezervno kodo
   * (porabljena se izbriše). Zahteva naloženi polji totpSecret/totpBackupCodes.
   */
  private async consumeSecondFactor(user: User, code: string): Promise<boolean> {
    const normalized = code.replace(/\s/g, '').toUpperCase();

    if (user.totpSecret && verifyTotpCode(user.totpSecret, normalized)) {
      return true;
    }

    if (user.totpBackupCodes) {
      let hashes: string[] = [];
      try {
        hashes = JSON.parse(user.totpBackupCodes) as string[];
      } catch {
        return false;
      }
      const hash = sha256(normalized);
      if (hashes.includes(hash)) {
        const remaining = hashes.filter((h) => h !== hash);
        await this.usersRepo.update(user.id, {
          totpBackupCodes: JSON.stringify(remaining),
        });
        return true;
      }
    }
    return false;
  }

  /**
   * 1. korak vklopa 2FA: ustvari skrivnost in vrne QR kodo.
   * 2FA še NI vklopljena — vklopi jo šele potrjena koda (enable2fa).
   */
  async setup2fa(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Uporabnik ni na voljo.');
    }
    if (user.totpEnabledAt) {
      throw new BadRequestException(
        'Dvojna avtentikacija je že vklopljena. Za novo skrivnost jo najprej izklopite.',
      );
    }

    const secret = generateTotpSecret();
    await this.usersRepo.update(userId, { totpSecret: secret });

    const label = user.email || user.username;
    const otpauthUrl = buildOtpauthUri('Plamen', label, secret);
    const qrDataUrl = await toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrDataUrl };
  }

  /**
   * 2. korak vklopa 2FA: potrdi kodo iz aplikacije → vklop + rezervne kode.
   * Rezervne kode se vrnejo SAMO tukaj (v bazi so le hashi).
   */
  async enable2fa(userId: string, code: string) {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.totpSecret')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user || !user.totpSecret) {
      throw new BadRequestException(
        'Najprej ustvarite QR kodo (korak nastavitve).',
      );
    }
    if (user.totpEnabledAt) {
      throw new BadRequestException('Dvojna avtentikacija je že vklopljena.');
    }
    const valid = verifyTotpCode(user.totpSecret, code.replace(/\s/g, ''));
    if (!valid) {
      throw new UnauthorizedException('Napačna koda. Poskusite znova.');
    }

    const backupCodes = Array.from({ length: 8 }, generateBackupCode);
    await this.usersRepo.update(userId, {
      totpEnabledAt: new Date(),
      totpBackupCodes: JSON.stringify(backupCodes.map(sha256)),
      // Razveljavi obstoječe refresh žetone — stare seje morajo skozi 2FA.
      tokenVersion: () => 'token_version + 1',
    });
    return {
      message: 'Dvojna avtentikacija je vklopljena.',
      backupCodes,
    };
  }

  /** Izklop 2FA — zahteva geslo IN veljavno kodo (TOTP ali rezervno). */
  async disable2fa(userId: string, password: string, code: string) {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.totpSecret')
      .addSelect('user.totpBackupCodes')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user || !user.totpEnabledAt) {
      throw new BadRequestException('Dvojna avtentikacija ni vklopljena.');
    }
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Napačno geslo.');
    }
    const codeOk = await this.consumeSecondFactor(user, code);
    if (!codeOk) {
      throw new UnauthorizedException('Napačna koda. Poskusite znova.');
    }

    await this.usersRepo.update(userId, {
      totpSecret: null,
      totpEnabledAt: null,
      totpBackupCodes: null,
      tokenVersion: () => 'token_version + 1',
    });
    return { message: 'Dvojna avtentikacija je izklopljena.' };
  }

  /** Stanje 2FA za prijavljenega uporabnika (za stran z nastavitvami). */
  async get2faStatus(userId: string) {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.totpBackupCodes')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user) {
      throw new UnauthorizedException('Uporabnik ni na voljo.');
    }
    let backupCodesRemaining = 0;
    if (user.totpBackupCodes) {
      try {
        backupCodesRemaining = (JSON.parse(user.totpBackupCodes) as string[])
          .length;
      } catch {
        backupCodesRemaining = 0;
      }
    }
    return {
      enabled: !!user.totpEnabledAt,
      enabledAt: user.totpEnabledAt ?? null,
      backupCodesRemaining,
    };
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
    if (!code || code.usedAt || code.revokedAt) {
      throw new UnauthorizedException(
        'Aktivacijska koda je neveljavna ali že porabljena. Za kodo nas kontaktirajte.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const { user, roles } = await this.dataSource.transaction(
      async (manager) => {
        // Atomarno porabi aktivacijsko kodo: pogojni UPDATE uspe le, če koda
        // še ni bila porabljena. Prepreči TOCTOU dirko (dve hkratni
        // registraciji z isto kodo). Ob izgubljeni dirki transakcija pade in
        // se organizacija ne ustvari.
        const consumed = await manager.update(
          RegistrationCode,
          { id: code.id, usedAt: IsNull(), revokedAt: IsNull() },
          { usedAt: new Date() },
        );
        if (consumed.affected !== 1) {
          throw new UnauthorizedException(
            'Aktivacijska koda je neveljavna ali že porabljena. Za kodo nas kontaktirajte.',
          );
        }

        const org = manager.create(Organization, {
          name: dto.organizationName,
          slug,
          // Koda določi trajanje naročnine (12 mesecev = letna, 2 = preizkus).
          // null = neomejeno.
          subscriptionExpiresAt:
            code.validMonths === null || code.validMonths === undefined
              ? null
              : addMonths(new Date(), code.validMonths),
        });
        const savedOrg = await manager.save(org);

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

        // Sledljivost: katero društvo in kdo je kodo porabil.
        await manager.update(RegistrationCode, code.id, {
          usedByOrganizationId: savedOrg.id,
          redeemedByUserId: savedUser.id,
        });

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

  /**
   * Posodobi FCM žeton prijavljenega uporabnika. Prazen niz (npr. ob odjavi)
   * shrani kot NULL, da naprava po odjavi ne prejema več push obvestil.
   */
  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.usersRepo.update(userId, { fcmToken: fcmToken || null });
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
      // Kriptografsko naključen žeton; v bazi je le SHA-256 hash — kraja
      // vsebine baze ne omogoči prevzema računov prek reset žetonov.
      const token = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await this.usersRepo.update(user.id, {
        passwordResetToken: sha256(token),
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
      .where('user.passwordResetToken = :token', { token: sha256(token) })
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
      // Nova prijava povsod — ukradene seje po resetu gesla ne preživijo.
      tokenVersion: () => 'token_version + 1',
    });
    return { message: 'Geslo je bilo uspešno posodobljeno.' };
  }
}
