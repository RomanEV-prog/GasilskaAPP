import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
import { EquipmentAssignment } from './equipment-assignment.entity';
import { Equipment } from './equipment.entity';
import {
  IssueEquipmentDto,
  ReturnEquipmentDto,
} from './dto/equipment-assignment.dto';
import {
  CreateEquipmentDto,
  QueryEquipmentDto,
  UpdateEquipmentDto,
} from './dto/equipment.dto';

/** Kršitev unikatne omejitve v Postgresu. */
const PG_UNIQUE_VIOLATION = '23505';

/** Imetnik v odgovorih — nikoli cel `User` (glej zasebnost članov). */
type HolderProjection = {
  id: string;
  firstName: string;
  lastName: string;
} | null;

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
    @InjectRepository(EquipmentAssignment)
    private readonly assignmentsRepo: Repository<EquipmentAssignment>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  /** Normalizira UID NFC oznake na veliko hex brez ločil. */
  private normalizeNfcUid(uid: string): string {
    return uid.toUpperCase().replace(/[^0-9A-F]/g, '');
  }

  /** Trenutno odprta zadolžitev kosa opreme (ali `null`). */
  private async openAssignment(
    equipmentId: string,
  ): Promise<EquipmentAssignment | null> {
    return this.assignmentsRepo.findOne({
      where: { equipmentId, returnedAt: IsNull() },
      relations: { user: true },
    });
  }

  private holderOf(assignment: EquipmentAssignment | null): HolderProjection {
    if (!assignment?.user) return null;
    const { id, firstName, lastName } = assignment.user;
    return { id, firstName, lastName };
  }

  /** QR format po specifikaciji: GASILAPP-{org_slug}-{inventory_number} */
  private async generateQrCode(
    organizationId: string,
    inventoryNumber?: string,
  ): Promise<string | undefined> {
    if (!inventoryNumber) {
      return undefined;
    }
    const org = await this.orgsRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      return undefined;
    }
    return `GASILAPP-${org.slug}-${inventoryNumber}`;
  }

  async create(
    organizationId: string,
    dto: CreateEquipmentDto,
  ): Promise<Equipment> {
    const qrCode = await this.generateQrCode(
      organizationId,
      dto.inventoryNumber,
    );
    if (qrCode) {
      const clash = await this.equipmentRepo.findOne({ where: { qrCode } });
      if (clash) {
        throw new ConflictException(
          'Oprema s to inventarno številko že obstaja.',
        );
      }
    }
    const equipment = this.equipmentRepo.create({
      ...dto,
      organizationId,
      qrCode,
    });
    return this.equipmentRepo.save(equipment);
  }

  async findAll(
    organizationId: string,
    query: QueryEquipmentDto = {},
  ): Promise<Equipment[]> {
    const qb = this.equipmentRepo
      .createQueryBuilder('equipment')
      .where('equipment.organizationId = :organizationId', { organizationId });

    if (query.category) {
      qb.andWhere('equipment.category = :category', {
        category: query.category,
      });
    }
    if (query.condition) {
      qb.andWhere('equipment.condition = :condition', {
        condition: query.condition,
      });
    }
    if (query.vehicleId) {
      qb.andWhere('equipment.vehicleId = :vehicleId', {
        vehicleId: query.vehicleId,
      });
    }

    const items = await qb.orderBy('equipment.name', 'ASC').getMany();
    return this.withHolders(items);
  }

  /**
   * Doda trenutnega imetnika vsakemu kosu. Ena sama poizvedba za vse odprte
   * zadolžitve — brez tega bi imeli N+1.
   */
  private async withHolders(items: Equipment[]): Promise<Equipment[]> {
    if (items.length === 0) return items;
    const open = await this.assignmentsRepo.find({
      where: { equipmentId: In(items.map((e) => e.id)), returnedAt: IsNull() },
      relations: { user: true },
    });
    const byEquipment = new Map(open.map((a) => [a.equipmentId, a]));
    return items.map((e) => {
      const a = byEquipment.get(e.id) ?? null;
      return Object.assign(e, {
        currentHolder: this.holderOf(a),
        issuedAt: a?.issuedAt ?? null,
      });
    });
  }

  async findOne(organizationId: string, id: string): Promise<Equipment> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id, organizationId },
      relations: { vehicle: true },
    });
    if (!equipment) {
      throw new NotFoundException('Oprema ni bila najdena.');
    }
    const open = await this.openAssignment(equipment.id);
    return Object.assign(equipment, {
      currentHolder: this.holderOf(open),
      issuedAt: open?.issuedAt ?? null,
    });
  }

  /**
   * Skupna projekcija za skeniranje (QR in NFC). Namerno ozka — brez
   * občutljivih podatkov vozila (VIN, registrska tablica, zavarovanje).
   * Vsebuje imetnika in datum nabave, ker je prav to cilj skeniranja:
   * ugotoviti, komu kos pripada in kako star je.
   */
  private toScanProjection(
    equipment: Equipment,
    open: EquipmentAssignment | null,
  ): Record<string, unknown> {
    return {
      id: equipment.id,
      name: equipment.name,
      category: equipment.category,
      inventoryNumber: equipment.inventoryNumber,
      location: equipment.location,
      condition: equipment.condition,
      lastInspection: equipment.lastInspection,
      nextInspection: equipment.nextInspection,
      expiryDate: equipment.expiryDate,
      purchaseDate: equipment.purchaseDate,
      notes: equipment.notes,
      qrCode: equipment.qrCode,
      nfcUid: equipment.nfcUid,
      isActive: equipment.isActive,
      currentHolder: this.holderOf(open),
      issuedAt: open?.issuedAt ?? null,
      vehicle: equipment.vehicle
        ? { id: equipment.vehicle.id, name: equipment.vehicle.name }
        : null,
    };
  }

  /**
   * Iskanje po QR kodi — za skeniranje z mobilno app. Omejeno na društvo
   * skenerja in aktivno opremo.
   */
  async findByQrCode(
    organizationId: string,
    qrCode: string,
  ): Promise<Record<string, unknown>> {
    const equipment = await this.equipmentRepo.findOne({
      where: { qrCode, organizationId, isActive: true },
      relations: { vehicle: true },
    });
    if (!equipment) {
      throw new NotFoundException('Oprema s to QR kodo ni bila najdena.');
    }
    return this.toScanProjection(
      equipment,
      await this.openAssignment(equipment.id),
    );
  }

  /** Iskanje po strojnem UID NFC oznake — zrcali `findByQrCode`. */
  async findByNfcUid(
    organizationId: string,
    nfcUid: string,
  ): Promise<Record<string, unknown>> {
    const equipment = await this.equipmentRepo.findOne({
      where: {
        nfcUid: this.normalizeNfcUid(nfcUid),
        organizationId,
        isActive: true,
      },
      relations: { vehicle: true },
    });
    if (!equipment) {
      throw new NotFoundException('Oprema s to NFC oznako ni bila najdena.');
    }
    return this.toScanProjection(
      equipment,
      await this.openAssignment(equipment.id),
    );
  }

  /** Oprema s pregledom v naslednjih N dneh — za opomnike/dashboard. */
  async findInspectionsDue(
    organizationId: string,
    days = 30,
  ): Promise<Equipment[]> {
    return this.equipmentRepo
      .createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.vehicle', 'vehicle')
      .where('equipment.organizationId = :organizationId', { organizationId })
      .andWhere('equipment.isActive = true')
      .andWhere('equipment.next_inspection IS NOT NULL')
      .andWhere('equipment.next_inspection <= CURRENT_DATE + :days::int', {
        days,
      })
      .orderBy('equipment.next_inspection', 'ASC')
      .getMany();
  }

  /** Oprema z rokom veljave v naslednjih N dneh — za opomnike. */
  async findExpiring(organizationId: string, days = 30): Promise<Equipment[]> {
    return this.equipmentRepo
      .createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.vehicle', 'vehicle')
      .where('equipment.organizationId = :organizationId', { organizationId })
      .andWhere('equipment.isActive = true')
      .andWhere('equipment.expiry_date IS NOT NULL')
      .andWhere('equipment.expiry_date <= CURRENT_DATE + :days::int', { days })
      .orderBy('equipment.expiry_date', 'ASC')
      .getMany();
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateEquipmentDto,
  ): Promise<Equipment> {
    const equipment = await this.findOne(organizationId, id);

    // Ob spremembi inventarne številke se QR koda regenerira.
    if (
      dto.inventoryNumber &&
      dto.inventoryNumber !== equipment.inventoryNumber
    ) {
      const qrCode = await this.generateQrCode(
        organizationId,
        dto.inventoryNumber,
      );
      if (qrCode) {
        const clash = await this.equipmentRepo.findOne({ where: { qrCode } });
        if (clash && clash.id !== id) {
          throw new ConflictException(
            'Oprema s to inventarno številko že obstaja.',
          );
        }
        equipment.qrCode = qrCode;
      }
    }

    // NFC oznaka: normaliziraj in preveri, da ni že vezana na drug kos.
    if (dto.nfcUid !== undefined) {
      if (dto.nfcUid === null) {
        equipment.nfcUid = null;
      } else {
        const uid = this.normalizeNfcUid(dto.nfcUid);
        const clash = await this.equipmentRepo.findOne({
          where: { nfcUid: uid },
        });
        if (clash && clash.id !== id) {
          throw new ConflictException(
            'Ta NFC oznaka je že povezana z drugo opremo.',
          );
        }
        equipment.nfcUid = uid;
      }
      delete dto.nfcUid;
    }

    Object.assign(equipment, dto);
    return this.equipmentRepo.save(equipment);
  }

  // ─── Zadolžitve ──────────────────────────────────────────────────────────

  /**
   * Zadolži kos opreme članu. Najemništvo se preveri prek starša
   * (`findOne` je tenant-scoped), član mora biti iz istega društva.
   */
  async issue(
    organizationId: string,
    equipmentId: string,
    actorId: string,
    dto: IssueEquipmentDto,
  ): Promise<EquipmentAssignment> {
    const equipment = await this.findOne(organizationId, equipmentId);
    if (!equipment.isActive) {
      throw new BadRequestException(
        'Neaktivne opreme ni mogoče zadolžiti.',
      );
    }

    const member = await this.usersRepo.findOne({
      where: { id: dto.userId, organizationId },
    });
    if (!member) {
      throw new BadRequestException('Član ne pripada temu društvu.');
    }
    if (!member.isActive) {
      throw new BadRequestException('Član je neaktiven.');
    }

    if (await this.openAssignment(equipmentId)) {
      throw new ConflictException(
        'Ta oprema je že zadolžena — najprej jo je treba vrniti.',
      );
    }

    const assignment = this.assignmentsRepo.create({
      equipmentId,
      userId: dto.userId,
      issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : new Date(),
      issuedBy: actorId,
      conditionAtIssue: dto.conditionAtIssue,
      issueNotes: dto.issueNotes,
    });

    try {
      const saved = await this.assignmentsRepo.save(assignment);
      if (dto.conditionAtIssue) {
        equipment.condition = dto.conditionAtIssue;
        await this.equipmentRepo.save(equipment);
      }
      return saved;
    } catch (err) {
      // Delni unikatni indeks ujame tekmo dveh hkratnih zadolžitev.
      if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException(
          'Ta oprema je že zadolžena — najprej jo je treba vrniti.',
        );
      }
      throw err;
    }
  }

  /** Vrne trenutno odprto zadolžitev kosa opreme. */
  async returnItem(
    organizationId: string,
    equipmentId: string,
    actorId: string,
    dto: ReturnEquipmentDto,
  ): Promise<EquipmentAssignment> {
    const equipment = await this.findOne(organizationId, equipmentId);
    const open = await this.openAssignment(equipmentId);
    if (!open) {
      throw new NotFoundException('Ta oprema trenutno ni zadolžena.');
    }

    const returnedAt = dto.returnedAt ? new Date(dto.returnedAt) : new Date();
    if (returnedAt < open.issuedAt) {
      throw new BadRequestException(
        'Datum vračila ne sme biti pred datumom zadolžitve.',
      );
    }

    open.returnedAt = returnedAt;
    open.returnedBy = actorId;
    open.conditionAtReturn = dto.conditionAtReturn;
    open.returnNotes = dto.returnNotes;
    const saved = await this.assignmentsRepo.save(open);

    if (dto.conditionAtReturn) {
      equipment.condition = dto.conditionAtReturn;
      await this.equipmentRepo.save(equipment);
    }
    return saved;
  }

  /**
   * Zgodovina zadolžitev kosa opreme, najnovejša prva.
   * Član je v reducirani projekciji — sicer bi tu obšli zasebnost članov.
   */
  async history(organizationId: string, equipmentId: string) {
    await this.findOne(organizationId, equipmentId); // preveri tenant + obstoj
    const rows = await this.assignmentsRepo.find({
      where: { equipmentId },
      relations: { user: true },
      order: { issuedAt: 'DESC' },
    });
    return rows.map((a) => ({
      id: a.id,
      issuedAt: a.issuedAt,
      returnedAt: a.returnedAt,
      conditionAtIssue: a.conditionAtIssue,
      conditionAtReturn: a.conditionAtReturn,
      issueNotes: a.issueNotes,
      returnNotes: a.returnNotes,
      user: a.user
        ? {
            id: a.user.id,
            firstName: a.user.firstName,
            lastName: a.user.lastName,
          }
        : null,
    }));
  }

  /** Odprte zadolžitve prijavljenega člana — "Moja zadolžena oprema". */
  async myAssignments(organizationId: string, userId: string) {
    const rows = await this.assignmentsRepo
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.equipment', 'equipment')
      .where('assignment.user_id = :userId', { userId })
      .andWhere('assignment.returned_at IS NULL')
      .andWhere('equipment.organization_id = :organizationId', {
        organizationId,
      })
      .orderBy('assignment.issued_at', 'DESC')
      .getMany();

    return rows.map((a) => ({
      id: a.id,
      issuedAt: a.issuedAt,
      conditionAtIssue: a.conditionAtIssue,
      issueNotes: a.issueNotes,
      equipment: a.equipment
        ? {
            id: a.equipment.id,
            name: a.equipment.name,
            category: a.equipment.category,
            inventoryNumber: a.equipment.inventoryNumber,
            condition: a.equipment.condition,
            expiryDate: a.equipment.expiryDate,
            nextInspection: a.equipment.nextInspection,
          }
        : null,
    }));
  }

  /** Mehki izbris — deaktivira opremo. */
  async deactivate(organizationId: string, id: string): Promise<Equipment> {
    const equipment = await this.findOne(organizationId, id);
    equipment.isActive = false;
    return this.equipmentRepo.save(equipment);
  }
}
