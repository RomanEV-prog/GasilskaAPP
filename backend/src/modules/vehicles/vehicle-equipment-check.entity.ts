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
import { User } from '../users/user.entity';
import { Vehicle } from './vehicle.entity';

/**
 * Inventura opreme vozila — en zapis na izveden pregled.
 * Najemništvo podeduje prek vozila (brez lastnega organization_id):
 * servis vozilo vedno najprej razreši prek tenant-scoped findOne.
 */
@Entity('vehicle_equipment_checks')
export class VehicleEquipmentCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id' })
  @Index()
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  /** Kdo je pregled izvedel; ob izbrisu člana ostane zapis (SET NULL). */
  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performed_by' })
  performer?: User | null;

  @Column({ name: 'performed_at', type: 'timestamptz' })
  performedAt: Date;

  /** Število pričakovanih kosov ob pregledu. */
  @Column({ type: 'int' })
  total: number;

  @Column({ name: 'present_ids', type: 'jsonb', default: () => "'[]'" })
  presentIds: string[];

  @Column({ name: 'missing_ids', type: 'jsonb', default: () => "'[]'" })
  missingIds: string[];

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
