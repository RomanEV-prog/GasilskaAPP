import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VehicleDriver } from './vehicle-driver.entity';

/** Tip vozila — ujema se z `vehicle_type` ENUM v bazi. */
export enum VehicleType {
  GVC = 'gvc',
  GVGP = 'gvgp',
  AC = 'ac',
  PV = 'pv',
  VAN = 'van',
  OTHER = 'other',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType })
  vehicleType: VehicleType;

  @Column({ name: 'license_plate', nullable: true, length: 20 })
  licensePlate?: string;

  @Column({ nullable: true, length: 50 })
  vin?: string;

  @Column({ nullable: true, type: 'int' })
  year?: number;

  @Column({ type: 'int', default: 0 })
  mileage: number;

  @Column({ name: 'registration_expires', type: 'date', nullable: true })
  registrationExpires?: string;

  @Column({ name: 'insurance_expires', type: 'date', nullable: true })
  insuranceExpires?: string;

  @Column({ name: 'service_due', type: 'date', nullable: true })
  serviceDue?: string;

  @Column({ name: 'service_mileage', type: 'int', nullable: true })
  serviceMileage?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => VehicleDriver, (driver) => driver.vehicle)
  drivers?: VehicleDriver[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
