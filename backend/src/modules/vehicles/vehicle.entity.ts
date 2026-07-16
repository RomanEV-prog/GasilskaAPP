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

/**
 * Oznake vozil po tipizaciji gasilskih vozil GZS (feedback PGD Pekre,
 * tabela "Tipizacija vozil" — 3. stolpec) + 'other' (Drugo).
 */
export const VEHICLE_OZNAKE = [
  // Poveljniška vozila
  'PV-1',
  'PV-2',
  'GVZ-1',
  'GVRZ',
  // Gasilska vozila
  'GV-1',
  'GVV-1',
  'GVV-2',
  // Gasilska vozila s cisterno
  'GVC-1',
  'GVC-2',
  'GVC-3',
  'GVC-4',
  // Gasilska vozila s prahom
  'GVS-1000',
  'GVS-2000',
  'GVSV',
  // Vozila za gašenje in reševanje z višin
  'ZD',
  'TD',
  'ALK',
  'GVCZD-1',
  'GVCZD-2',
  'GVCTD-1',
  'GVCTD-2',
  'GVCALK-1',
  'GVCALK-2',
  // Tehnična in orodna vozila
  'HTRV',
  'TRV',
  'OVNS',
  'OVRV',
  // Gasilska vozila za gozdne požare
  'GVGP-1',
  'GVGP-2',
  'GCGP-1',
  'GCGP-2',
  'GCGP-3',
  // Gasilska logistična vozila
  'GVM-1',
  'GVM-2',
  'VGV',
  'GVL-1',
  'GVL-2',
  'GVT',
  'GVK',
  'GVO',
  // Gasilski čolni
  'GRČ-1',
  'GRČ-2',
  'GRČ-3',
  // Gasilski priklopniki
  'PMB',
  'PR',
  'PŠ',
  'PČ',
  'PL',
  'PVT',
  'other',
] as const;

/** Stare vrednosti (pred prehodom na tipizacijo) — obstoječi zapisi v bazi. */
export const LEGACY_VEHICLE_TYPES = ['gvc', 'gvgp', 'ac', 'pv', 'van'] as const;

/** Vse dovoljene vrednosti stolpca vehicle_type. */
export const VALID_VEHICLE_TYPES: string[] = [
  ...VEHICLE_OZNAKE,
  ...LEGACY_VEHICLE_TYPES,
];

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'vehicle_type', length: 50 })
  vehicleType: string;

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
