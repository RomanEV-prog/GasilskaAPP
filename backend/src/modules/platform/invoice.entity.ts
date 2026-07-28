import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Izdan račun za naročnino društva.
 *
 * Zanka: izdaš račun → društvo plača → označiš plačano → naročnina se
 * podaljša za `months`. Rok poteka na društvu sam ne pove, ali je bilo
 * plačano; ta tabela pove.
 *
 * Zneski so `numeric` v bazi in `string` v TypeScript (pg driver ne
 * pretvarja v number, da ne izgubi natančnosti) — glej `toNumber()`.
 */
@Entity('platform_invoices')
export class PlatformInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Zaporedna številka v obliki `YYYY-NNN` (npr. 2026-001). */
  @Column({ length: 20, unique: true })
  number: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'issued_at', type: 'date' })
  issuedAt: string;

  @Column({ name: 'due_at', type: 'date' })
  dueAt: string;

  /** Obdobje naročnine, ki ga račun pokriva. */
  @Column({ name: 'period_from', type: 'date' })
  periodFrom: string;

  @Column({ name: 'period_to', type: 'date' })
  periodTo: string;

  @Column({ type: 'int' })
  months: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: string;

  /** 0 za nezavezanca za DDV (94. člen ZDDV-1). */
  @Column({ name: 'vat_rate', type: 'numeric', precision: 5, scale: 2 })
  vatRate: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note?: string | null;

  @Column({ name: 'paid_at', type: 'date', nullable: true })
  paidAt?: string | null;

  /** Aktivacijska koda, izdana ob plačilu (če je bila). */
  @Column({ name: 'registration_code_id', type: 'uuid', nullable: true })
  registrationCodeId?: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

/** `numeric` iz baze pride kot niz; za izračune ga je treba pretvoriti. */
export function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : parseFloat(value);
}
