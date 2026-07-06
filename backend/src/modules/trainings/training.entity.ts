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

@Entity('trainings')
export class Training {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, length: 255 })
  provider?: string;

  @Column({ name: 'completed_at', type: 'date' })
  completedAt: string;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt?: string;

  @Column({ name: 'document_url', nullable: true, length: 500 })
  documentUrl?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'reminder_sent', default: false })
  reminderSent: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
