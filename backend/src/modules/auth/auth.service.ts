import {
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
import { Organization } from '../organizations/organization.entity';
import { UserRole } from '../users/user-role.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  private signToken(user: User, roles: string[]): string {
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
      roles,
    };
    return this.jwtService.sign(payload);
  }

  private buildAuthResponse(user: User, roles: string[]) {
    return {
      accessToken: this.signToken(user, roles),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        roles,
      },
    };
  }

  /** Prijava — preveri geslo, posodobi last_login_at, vrne JWT. */
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Napačna e-pošta ali geslo.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Vaš račun je deaktiviran.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Napačna e-pošta ali geslo.');
    }

    user.lastLoginAt = new Date();
    await this.usersRepo.update(user.id, { lastLoginAt: user.lastLoginAt });

    const roles = (user.roles ?? []).map((r) => r.role);
    return this.buildAuthResponse(user, roles);
  }

  /**
   * Registracija novega društva — ustvari organizacijo + org_admin uporabnika.
   * Vse v eni transakciji.
   */
  async register(dto: RegisterDto) {
    const slug = dto.organizationSlug.toLowerCase();
    const email = dto.email.toLowerCase();

    const slugTaken = await this.orgsRepo.findOne({ where: { slug } });
    if (slugTaken) {
      throw new ConflictException('Društvo s to oznako že obstaja.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const { user, roles } = await this.dataSource.transaction(
      async (manager) => {
        const org = manager.create(Organization, {
          name: dto.organizationName,
          slug,
        });
        const savedOrg = await manager.save(org);

        const newUser = manager.create(User, {
          organizationId: savedOrg.id,
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
