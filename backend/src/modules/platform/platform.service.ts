import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { In, IsNull, Repository } from 'typeorm';
import {
  daysUntilExpiry,
  extendSubscription,
  isExpired,
} from '../../common/utils/subscription.util';
import { RegistrationCode } from '../auth/registration-code.entity';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
import {
  IssueCodesDto,
  MAX_CODES_PER_BATCH,
  SetSubscriptionDto,
} from './dto/platform.dto';

/**
 * Predpona aktivacijskih kod. Ostaja `GASIL` kljub preimenovanju v Plamen —
 * kode so že v obtoku, iskanje je po točnem nizu.
 */
const CODE_PREFIX = 'GASIL';

/**
 * Abeceda brez dvoumnih znakov (brez I, O, 0, 1) — kode se prepisujejo ročno
 * iz e-pošte. 32 znakov = natanko 5 bitov na znak, zato je izbira z masko
 * enakomerna (brez pristranskosti po modulu).
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Koliko naključnih znakov ima koda (8 znakov = 40 bitov). */
const CODE_LENGTH = 8;

export interface OrganizationOverview {
  id: string;
  name: string;
  slug: string;
  city?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  subscriptionExpiresAt: Date | null;
  subscriptionPlan: string | null;
  expired: boolean;
  daysLeft: number | null;
  memberCount: number;
  createdAt: Date;
}

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
    @InjectRepository(RegistrationCode)
    private readonly codesRepo: Repository<RegistrationCode>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  // ---------------------------------------------------------------- društva

  /**
   * Vsa društva na platformi s stanjem naročnine in številom aktivnih članov.
   *
   * Razvrščena po **poteku naročnine** (najbližji prvi, neomejena na koncu) —
   * po imenu bi se društvo, ki mu poteče jutri, skrilo sredi seznama.
   */
  async listOrganizations(): Promise<OrganizationOverview[]> {
    const orgs = await this.orgsRepo.find({ order: { name: 'ASC' } });
    orgs.sort((a, b) => {
      const left = a.subscriptionExpiresAt?.getTime() ?? Infinity;
      const right = b.subscriptionExpiresAt?.getTime() ?? Infinity;
      return left === right ? a.name.localeCompare(b.name, 'sl') : left - right;
    });
    const counts = await this.usersRepo
      .createQueryBuilder('u')
      .select('u.organizationId', 'organizationId')
      .addSelect('COUNT(*)', 'count')
      .where('u.isActive = true')
      .groupBy('u.organizationId')
      .getRawMany<{ organizationId: string; count: string }>();

    const countByOrg = new Map(
      counts.map((row) => [row.organizationId, Number(row.count)]),
    );

    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      city: org.city,
      email: org.email,
      phone: org.phone,
      isActive: org.isActive,
      subscriptionExpiresAt: org.subscriptionExpiresAt ?? null,
      subscriptionPlan: org.subscriptionPlan ?? null,
      expired: isExpired(org.subscriptionExpiresAt),
      daysLeft: daysUntilExpiry(org.subscriptionExpiresAt),
      memberCount: countByOrg.get(org.id) ?? 0,
      createdAt: org.createdAt,
    }));
  }

  /**
   * Ročna nastavitev naročnine društva (brez kode) — za dogovore po telefonu,
   * popravke in pilotna društva.
   */
  async setSubscription(
    orgId: string,
    dto: SetSubscriptionDto,
  ): Promise<Organization> {
    const org = await this.orgsRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Društvo ni bilo najdeno.');
    }

    if (dto.plan !== undefined) {
      org.subscriptionPlan = dto.plan;
    }

    if (dto.unlimited) {
      org.subscriptionExpiresAt = null;
    } else if (dto.addMonths) {
      org.subscriptionExpiresAt = extendSubscription(
        org.subscriptionExpiresAt,
        dto.addMonths,
      );
    } else if (dto.expiresAt) {
      org.subscriptionExpiresAt = new Date(dto.expiresAt);
    } else if (dto.plan === undefined) {
      throw new BadRequestException(
        'Navedi enega od: plan, expiresAt, addMonths ali unlimited.',
      );
    }

    return this.orgsRepo.save(org);
  }

  // ------------------------------------------------------------------- kode

  /**
   * Izda nove aktivacijske kode.
   *
   * `validMonths` določi, koliko mesecev dostopa koda odklene
   * (12 = letna naročnina, 2 = preizkus); `null`/izpuščeno = neomejeno.
   */
  async issueCodes(
    dto: IssueCodesDto,
    issuedByUserId: string | null,
  ): Promise<RegistrationCode[]> {
    const count = Math.min(dto.count ?? 1, MAX_CODES_PER_BATCH);
    const issued: RegistrationCode[] = [];

    for (let i = 0; i < count; i++) {
      issued.push(
        await this.codesRepo.save(
          this.codesRepo.create({
            code: await this.generateUniqueCode(),
            note: dto.note,
            validMonths: dto.validMonths ?? null,
            issuedByUserId,
          }),
        ),
      );
    }
    return issued;
  }

  /** Vse izdane kode, najnovejše prve, z imenom društva, ki jih je porabilo. */
  async listCodes() {
    const codes = await this.codesRepo.find({
      order: { createdAt: 'DESC' },
      take: 500,
    });

    const orgIds = [
      ...new Set(codes.map((c) => c.usedByOrganizationId).filter(Boolean)),
    ] as string[];
    const orgs = orgIds.length
      ? await this.orgsRepo.find({ where: { id: In(orgIds) } })
      : [];
    const nameById = new Map(orgs.map((o) => [o.id, o.name]));

    return codes.map((code) => ({
      id: code.id,
      code: code.code,
      note: code.note,
      validMonths: code.validMonths ?? null,
      usedAt: code.usedAt ?? null,
      usedByOrganizationId: code.usedByOrganizationId ?? null,
      usedByOrganizationName: code.usedByOrganizationId
        ? (nameById.get(code.usedByOrganizationId) ?? null)
        : null,
      revokedAt: code.revokedAt ?? null,
      createdAt: code.createdAt,
      status: code.usedAt ? 'used' : code.revokedAt ? 'revoked' : 'available',
    }));
  }

  /** Prekliče še neporabljeno kodo (napačno poslana, prekinjen dogovor). */
  async revokeCode(id: string): Promise<RegistrationCode> {
    const code = await this.codesRepo.findOne({ where: { id } });
    if (!code) {
      throw new NotFoundException('Aktivacijska koda ni bila najdena.');
    }
    if (code.usedAt) {
      throw new BadRequestException(
        'Koda je že porabljena in je ni mogoče preklicati.',
      );
    }
    code.revokedAt = new Date();
    return this.codesRepo.save(code);
  }

  /**
   * Unovči kodo za PODALJŠANJE obstoječega društva.
   *
   * Registracija novega društva porabi kodo drugje (AuthService.register),
   * ker mora biti v isti transakciji kot nastanek organizacije.
   */
  async redeemForOrganization(
    orgId: string,
    rawCode: string,
    userId: string,
  ): Promise<Organization> {
    const org = await this.orgsRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Društvo ni bilo najdeno.');
    }

    const code = await this.codesRepo.findOne({
      where: { code: rawCode.trim().toUpperCase() },
    });
    if (!code || code.usedAt || code.revokedAt) {
      throw new BadRequestException(
        'Aktivacijska koda je neveljavna, preklicana ali že porabljena.',
      );
    }

    // `!= null` zajame tudi undefined (stolpec je nullable) — namerno ohlapna
    // primerjava, ne pomota.
    const months = code.validMonths != null ? code.validMonths : null;

    // Neomejenega dostopa koda ne more izboljšati — ne porabi je po nepotrebnem.
    if (!org.subscriptionExpiresAt && months !== null) {
      throw new BadRequestException(
        'Društvo ima neomejen dostop — koda ni potrebna. Shranite jo za pozneje.',
      );
    }

    // Atomarna poraba: pogojni UPDATE uspe le, če koda še ni bila porabljena.
    // Prepreči dirko, če dva admina hkrati vneseta isto kodo.
    const consumed = await this.codesRepo.update(
      { id: code.id, usedAt: IsNull(), revokedAt: IsNull() },
      {
        usedAt: new Date(),
        usedByOrganizationId: orgId,
        redeemedByUserId: userId,
      },
    );
    if (consumed.affected !== 1) {
      throw new BadRequestException(
        'Aktivacijska koda je neveljavna, preklicana ali že porabljena.',
      );
    }

    org.subscriptionExpiresAt =
      months === null
        ? null
        : extendSubscription(org.subscriptionExpiresAt, months);
    return this.orgsRepo.save(org);
  }

  // ------------------------------------------------------------ generiranje

  /**
   * Naključna koda oblike `GASIL-XXXX-XXXX`.
   * Ob (skrajno redkem) trku unikatnega indeksa poskusi znova.
   */
  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const taken = await this.codesRepo.findOne({ where: { code } });
      if (!taken) return code;
    }
    throw new BadRequestException(
      'Kode ni bilo mogoče ustvariti. Poskusite znova.',
    );
  }
}

/** Izpiše kodo oblike `GASIL-XXXX-XXXX` iz nedvoumne abecede. */
export function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let raw = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    // 32-znakovna abeceda = 5 bitov; maska 0x1f je enakomerna izbira.
    raw += CODE_ALPHABET[bytes[i] & 0x1f];
  }
  return `${CODE_PREFIX}-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}
