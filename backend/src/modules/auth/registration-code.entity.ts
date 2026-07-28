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

  /**
   * Koliko mesecev dostopa koda odklene (12 = letna naročnina,
   * 2 = preizkus). `null` = neomejeno.
   */
  @Column({ name: 'valid_months', type: 'int', nullable: true })
  validMonths?: number | null;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt?: Date;

  /** ID društva, ki je kodo porabilo. */
  @Column({ name: 'used_by_organization_id', type: 'uuid', nullable: true })
  usedByOrganizationId?: string | null;

  /** Uporabnik, ki je kodo unovčil (pri podaljšanju obstoječega društva). */
  @Column({ name: 'redeemed_by_user_id', type: 'uuid', nullable: true })
  redeemedByUserId?: string | null;

  /** Preklicana koda se ne da unovčiti (napačno poslana, prekinjen dogovor). */
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  /** Kdo je kodo izdal (super_admin); `null` pri izdaji z master ključem. */
  @Column({ name: 'issued_by_user_id', type: 'uuid', nullable: true })
  issuedByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
