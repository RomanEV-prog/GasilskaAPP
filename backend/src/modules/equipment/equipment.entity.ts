import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';

/** Stanje opreme — ujema se z `equipment_condition` ENUM v bazi. */
export enum EquipmentCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  OUT_OF_SERVICE = 'out_of_service',
}

@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId?: string;

  @ManyToOne(() => Vehicle, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, length: 100 })
  category?: string;

  @Column({ name: 'inventory_number', nullable: true, length: 100 })
  inventoryNumber?: string;

  @Column({ nullable: true, length: 255 })
  location?: string;

  @Column({
    type: 'enum',
    enum: EquipmentCondition,
    default: EquipmentCondition.GOOD,
  })
  condition: EquipmentCondition;

  @Column({ name: 'last_inspection', type: 'date', nullable: true })
  lastInspection?: string;

  @Column({ name: 'next_inspection', type: 'date', nullable: true })
  nextInspection?: string;

  /** Rok veljave/trajanja (zaščitna oprema ima rok uporabe). */
  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'qr_code', nullable: true, length: 255, unique: true })
  qrCode?: string;

  /**
   * Strojni UID NFC oznake (NTAG213, 13,56 MHz) — velika hex brez ločil.
   * Namerno hranimo UID in ne pišemo NDEF vsebine na oznako: deluje s prazno
   * nalepko, nihče je ne more po nesreči prepisati, resnica ostane v bazi.
   * UID ni varnostni žeton (klonirljive oznake obstajajo) — za inventar zadošča.
   */
  // Tip je eksplicitno naveden: iz unije `string | null` ga TypeORM ne izpelje.
  @Column({
    name: 'nfc_uid',
    type: 'varchar',
    nullable: true,
    length: 32,
    unique: true,
  })
  nfcUid?: string | null;

  /** Datum nabave — podlaga za dejansko starost opreme ob skeniranju. */
  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
