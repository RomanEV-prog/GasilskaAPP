import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemRole } from '../../common/enums/roles.enum';
import { Equipment } from '../equipment/equipment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { VehicleDriver } from './vehicle-driver.entity';
import { VehicleEquipmentCheck } from './vehicle-equipment-check.entity';
import { Vehicle } from './vehicle.entity';
import {
  AddDriverDto,
  CreateEquipmentCheckDto,
  CreateVehicleDto,
  UpdateVehicleDto,
} from './dto/vehicle.dto';

/** Prejemniki obvestila o manjkajoči opremi — isti kot opomniki za opremo. */
const EQUIPMENT_MANAGE_ROLES: SystemRole[] = [
  SystemRole.ORG_ADMIN,
  SystemRole.CHIEF_MACHINIST,
  SystemRole.TOOLKEEPER,
  SystemRole.ASSISTANT_BREATHING_APPARATUS,
];

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(VehicleDriver)
    private readonly driversRepo: Repository<VehicleDriver>,
    @InjectRepository(VehicleEquipmentCheck)
    private readonly checksRepo: Repository<VehicleEquipmentCheck>,
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Vozniki brez občutljivih polj uporabnika. */
  private sanitizeDrivers(vehicle: Vehicle): Vehicle {
    if (vehicle.drivers) {
      vehicle.drivers = vehicle.drivers.map((d) => ({
        ...d,
        user: d.user
          ? ({
              id: d.user.id,
              firstName: d.user.firstName,
              lastName: d.user.lastName,
              phone: d.user.phone,
            } as any)
          : undefined,
      }));
    }
    return vehicle;
  }

  async create(
    organizationId: string,
    dto: CreateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = this.vehiclesRepo.create({ ...dto, organizationId });
    return this.vehiclesRepo.save(vehicle);
  }

  async findAll(organizationId: string): Promise<Vehicle[]> {
    const vehicles = await this.vehiclesRepo.find({
      where: { organizationId },
      relations: { drivers: { user: true } },
      order: { name: 'ASC' },
    });
    return vehicles.map((v) => this.sanitizeDrivers(v));
  }

  async findOne(organizationId: string, id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepo.findOne({
      where: { id, organizationId },
      relations: { drivers: { user: true } },
    });
    if (!vehicle) {
      throw new NotFoundException('Vozilo ni bilo najdeno.');
    }
    return this.sanitizeDrivers(vehicle);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = await this.findOne(organizationId, id);
    Object.assign(vehicle, dto);
    await this.vehiclesRepo.save(vehicle);
    return this.findOne(organizationId, id);
  }

  /** Mehki izbris — deaktivira vozilo. */
  async deactivate(organizationId: string, id: string): Promise<Vehicle> {
    const vehicle = await this.findOne(organizationId, id);
    vehicle.isActive = false;
    return this.vehiclesRepo.save(vehicle);
  }

  /**
   * Vozila s potekajočimi roki (registracija, zavarovanje ali servis)
   * v naslednjih N dneh — za opomnike in dashboard.
   */
  async findExpiring(organizationId: string, days = 30): Promise<Vehicle[]> {
    return this.vehiclesRepo
      .createQueryBuilder('vehicle')
      .where('vehicle.organizationId = :organizationId', { organizationId })
      .andWhere('vehicle.isActive = true')
      .andWhere(
        `(
          vehicle.registration_expires <= CURRENT_DATE + :days::int
          OR vehicle.insurance_expires <= CURRENT_DATE + :days::int
          OR vehicle.service_due <= CURRENT_DATE + :days::int
        )`,
        { days },
      )
      .orderBy('vehicle.registration_expires', 'ASC', 'NULLS LAST')
      .getMany();
  }

  async addDriver(
    organizationId: string,
    vehicleId: string,
    dto: AddDriverDto,
  ): Promise<VehicleDriver> {
    await this.findOne(organizationId, vehicleId); // preveri tenant + obstoj

    const exists = await this.driversRepo.findOne({
      where: { vehicleId, userId: dto.userId },
    });
    if (exists) {
      throw new ConflictException('Ta član je že voznik tega vozila.');
    }

    const driver = this.driversRepo.create({ vehicleId, userId: dto.userId });
    return this.driversRepo.save(driver);
  }

  async removeDriver(
    organizationId: string,
    vehicleId: string,
    userId: string,
  ): Promise<void> {
    await this.findOne(organizationId, vehicleId);

    const driver = await this.driversRepo.findOne({
      where: { vehicleId, userId },
    });
    if (!driver) {
      throw new NotFoundException('Voznik ni bil najden.');
    }
    await this.driversRepo.remove(driver);
  }

  /**
   * Zabeleži inventuro opreme vozila. Upošteva samo kose, ki v resnici
   * pripadajo temu vozilu in društvu — tuji ID-ji se tiho izpustijo, da
   * podtaknjeni zahtevek ne more beležiti tuje opreme. Ob manjkih obvesti
   * upravljavce opreme.
   */
  async createEquipmentCheck(
    organizationId: string,
    vehicleId: string,
    actorId: string,
    dto: CreateEquipmentCheckDto,
  ): Promise<VehicleEquipmentCheck> {
    const vehicle = await this.findOne(organizationId, vehicleId);

    const valid = await this.equipmentRepo.find({
      where: { organizationId, vehicleId, isActive: true },
      select: { id: true, name: true },
    });
    const nameById = new Map(valid.map((e) => [e.id, e.name]));
    const presentIds = dto.presentIds.filter((id) => nameById.has(id));
    const missingIds = dto.missingIds.filter(
      (id) => nameById.has(id) && !presentIds.includes(id),
    );

    const check = this.checksRepo.create({
      vehicleId,
      performedBy: actorId,
      performedAt: new Date(),
      total: presentIds.length + missingIds.length,
      presentIds,
      missingIds,
      notes: dto.notes ?? null,
    });
    const saved = await this.checksRepo.save(check);

    if (missingIds.length > 0) {
      const lines = missingIds.map((id) => nameById.get(id)).filter(Boolean);
      await this.notificationsService.createForRoles(
        organizationId,
        EQUIPMENT_MANAGE_ROLES,
        {
          title: `🚒 Pregled opreme ${vehicle.name}: manjka ${missingIds.length} kos(ov)`,
          body: lines.join('\n'),
          type: 'equipment_reminder',
        },
      );
    }
    return saved;
  }

  /** Zgodovina inventur vozila, najnovejša prva (izvajalec v ozki projekciji). */
  async equipmentChecks(organizationId: string, vehicleId: string) {
    await this.findOne(organizationId, vehicleId); // preveri tenant + obstoj
    const rows = await this.checksRepo.find({
      where: { vehicleId },
      relations: { performer: true },
      order: { performedAt: 'DESC' },
      take: 20,
    });
    return rows.map((c) => ({
      id: c.id,
      performedAt: c.performedAt,
      total: c.total,
      presentCount: c.presentIds.length,
      missingIds: c.missingIds,
      notes: c.notes,
      performer: c.performer
        ? {
            id: c.performer.id,
            firstName: c.performer.firstName,
            lastName: c.performer.lastName,
          }
        : null,
    }));
  }

  /** Oprema, ki domuje na vozilu — za inventuro in prikaz na vozilu. */
  async equipmentOnVehicle(organizationId: string, vehicleId: string) {
    await this.findOne(organizationId, vehicleId);
    return this.equipmentRepo.find({
      where: { organizationId, vehicleId, isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        inventoryNumber: true,
        nfcUid: true,
        qrCode: true,
      },
      order: { name: 'ASC' },
    });
  }
}
