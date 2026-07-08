import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Predpomnjena intervencija iz javnega portala SPIN (spin3.sos112.si).
 * Podatek je javen in DELJEN med vsemi društvi (brez organization_id) —
 * služi za dedup (po `spinGuid`) in za prikaz nedavnih intervencij po občini.
 * Obveščanje članov je vezano na društvo prek `Notification`.
 */
@Entity('spin_interventions')
export class SpinIntervention {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Unikaten identifikator iz SPIN RSS (`<guid>`, hkrati URL dogodka). */
  @Index({ unique: true })
  @Column({ name: 'spin_guid', length: 500 })
  spinGuid: string;

  /** Vrsta intervencije, npr. "Požar, eksplozija". */
  @Column({ name: 'spin_type', length: 255, nullable: true })
  spinType?: string;

  /** Občina intervencije (če jo je bilo mogoče razbrati iz feeda). */
  @Index()
  @Column({ length: 255, nullable: true })
  obcina?: string;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 500, nullable: true })
  link?: string;

  /** Čas intervencije (iz `<pubDate>`). */
  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
