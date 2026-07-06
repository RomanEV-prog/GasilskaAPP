import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Ciljna skupina — ujema se z `notification_target` ENUM v bazi. */
export enum NotificationTarget {
  ALL = 'all',
  OPERATIVE = 'operative',
  YOUTH = 'youth',
  LEADERSHIP = 'leadership',
  SPECIFIC = 'specific',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ length: 50, default: 'general' })
  type: string;

  @Column({
    type: 'enum',
    enum: NotificationTarget,
    default: NotificationTarget.ALL,
  })
  target: NotificationTarget;

  @Column({ name: 'target_user_ids', type: 'uuid', array: true, nullable: true })
  targetUserIds?: string[];

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, any>;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
