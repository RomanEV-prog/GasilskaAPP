import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Aktivacijska koda za registracijo novega društva.
 * Izda jo upravitelj platforme; vsaka koda je enkratna.
 */
@Entity('registration_codes')
export class RegistrationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 32, unique: true })
  code: string;

  /** Poljubna opomba — komu je bila koda izdana. */
  @Column({ nullable: true, length: 255 })
  note?: string;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt?: Date;

  /** ID društva, ki je kodo porabilo. */
  @Column({ name: 'used_by_organization_id', nullable: true })
  usedByOrganizationId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
