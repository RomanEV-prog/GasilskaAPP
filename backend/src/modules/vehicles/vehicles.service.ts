import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleDriver } from './vehicle-driver.entity';
import { Vehicle } from './vehicle.entity';
import {
  AddDriverDto,
  CreateVehicleDto,
  UpdateVehicleDto,
} from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(VehicleDriver)
    private readonly driversRepo: Repository<VehicleDriver>,
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
}
