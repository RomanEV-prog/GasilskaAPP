import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true, length: 100 })
  slug: string;

  @Column({ nullable: true, length: 255 })
  address?: string;

  @Column({ nullable: true, length: 100 })
  city?: string;

  @Column({ name: 'postal_code', nullable: true, length: 20 })
  postalCode?: string;

  @Column({ nullable: true, length: 50 })
  phone?: string;

  @Column({ nullable: true, length: 255 })
  email?: string;

  @Column({ nullable: true, length: 255 })
  website?: string;

  @Column({ name: 'logo_url', nullable: true, length: 500 })
  logoUrl?: string;

  /** Občina za obveščanje o intervencijah SPIN (ime iz odObmocje). */
  @Column({ name: 'spin_obcina', nullable: true, length: 255 })
  spinObcina?: string;

  /** ID občine v SPIN (odObmocje) — za morebitno prihodnje filtriranje. */
  @Column({ name: 'spin_obcina_id', type: 'bigint', nullable: true })
  spinObcinaId?: number;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
