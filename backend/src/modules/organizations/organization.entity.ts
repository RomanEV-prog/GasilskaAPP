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

  /**
   * Zunanja povezava za fotografije (npr. skupni Google Foto / OneDrive album).
   * Admin jo nastavi; člani jo odprejo v brskalniku (gledanje + nalaganje slik).
   * Slik NE hranimo v našem sistemu.
   */
  @Column({ name: 'photo_upload_link', nullable: true, length: 500 })
  photoUploadLink?: string;

  /**
   * Občine za obveščanje o intervencijah SPIN (imena iz odObmocje).
   * Društvo lahko izbere več občin (svojo + sosednje, s katerimi sodeluje).
   * Prazen seznam / null = brez obveščanja.
   */
  @Column({ name: 'spin_obcine', type: 'jsonb', nullable: true })
  spinObcine?: string[] | null;

  /** Zastarelo — enojna občina (nadomeščeno s spinObcine). Ohranjeno za migracijo. */
  @Column({ name: 'spin_obcina', nullable: true, length: 255 })
  spinObcina?: string;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
