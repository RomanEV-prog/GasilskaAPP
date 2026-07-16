import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { Equipment } from './equipment.entity';
import {
  CreateEquipmentDto,
  QueryEquipmentDto,
  UpdateEquipmentDto,
} from './dto/equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
  ) {}

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

    return qb.orderBy('equipment.name', 'ASC').getMany();
  }

  async findOne(organizationId: string, id: string): Promise<Equipment> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id, organizationId },
      relations: { vehicle: true },
    });
    if (!equipment) {
      throw new NotFoundException('Oprema ni bila najdena.');
    }
    return equipment;
  }

  /**
   * Iskanje po QR kodi — za skeniranje z mobilno app. Omejeno na društvo
   * skenerja in aktivno opremo; vrne le varna polja (brez občutljivih podatkov
   * vozila, npr. VIN/registrska tablica/zavarovanje).
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
      notes: equipment.notes,
      qrCode: equipment.qrCode,
      isActive: equipment.isActive,
      vehicle: equipment.vehicle
        ? { id: equipment.vehicle.id, name: equipment.vehicle.name }
        : null,
    };
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

    Object.assign(equipment, dto);
    return this.equipmentRepo.save(equipment);
  }

  /** Mehki izbris — deaktivira opremo. */
  async deactivate(organizationId: string, id: string): Promise<Equipment> {
    const equipment = await this.findOne(organizationId, id);
    equipment.isActive = false;
    return this.equipmentRepo.save(equipment);
  }
}
