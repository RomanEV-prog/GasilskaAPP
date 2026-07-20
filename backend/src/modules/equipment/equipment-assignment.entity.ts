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
import { Equipment, EquipmentCondition } from './equipment.entity';

/**
 * Zadolžitev kosa opreme članu — trajna zgodovina (kdo je kdaj kaj imel).
 *
 * Odprta zadolžitev = `returnedAt IS NULL`. Da posamezen kos ne more biti
 * hkrati zadolžen dvema članoma, invarianto vsili delni unikatni indeks
 * `idx_eq_assign_open` v bazi (glej docs/migrations/2026-07-20-zadolzitve-opreme.sql),
 * ne aplikacijska logika — ta ob hkratnih zahtevkih ne bi zdržala.
 *
 * Najemništvo (organization_id) se podeduje prek opreme, enako kot pri
 * `event_attendance`; servis vedno najprej razreši starša prek tenant-scoped
 * `findOne`.
 */
@Entity('equipment_assignments')
export class EquipmentAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'equipment_id' })
  @Index()
  equipmentId: string;

  @ManyToOne(() => Equipment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment?: Equipment;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'issued_at', type: 'timestamptz', default: () => 'NOW()' })
  issuedAt: Date;

  /** `null` = kos je še zadolžen. Tip naveden eksplicitno (unija z null). */
  @Column({ name: 'returned_at', type: 'timestamptz', nullable: true })
  returnedAt?: Date | null;

  /** Kdo je opremo izdal oz. prevzel nazaj (član vodstva/orodjar). */
  @Column({ name: 'issued_by', nullable: true })
  issuedBy?: string;

  @Column({ name: 'returned_by', nullable: true })
  returnedBy?: string;

  @Column({
    name: 'condition_at_issue',
    type: 'enum',
    enum: EquipmentCondition,
    nullable: true,
  })
  conditionAtIssue?: EquipmentCondition;

  @Column({
    name: 'condition_at_return',
    type: 'enum',
    enum: EquipmentCondition,
    nullable: true,
  })
  conditionAtReturn?: EquipmentCondition;

  @Column({ name: 'issue_notes', type: 'text', nullable: true })
  issueNotes?: string;

  @Column({ name: 'return_notes', type: 'text', nullable: true })
  returnNotes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
