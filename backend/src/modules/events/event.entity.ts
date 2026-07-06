import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MembershipStatus } from '../../common/enums/roles.enum';
import { User } from '../users/user.entity';
import { EventAttendance } from './event-attendance.entity';
import { EventRsvp } from './event-rsvp.entity';

/** Tip dogodka — ujema se z `event_type` ENUM v bazi. */
export enum EventType {
  DRILL = 'drill',
  MEETING = 'meeting',
  COMPETITION = 'competition',
  INTERVENTION = 'intervention',
  CLEANUP = 'cleanup',
  CELEBRATION = 'celebration',
  ASSEMBLY = 'assembly',
  OTHER = 'other',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true, length: 255 })
  location?: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: EventType,
    default: EventType.OTHER,
  })
  eventType: EventType;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt?: Date;

  @Column({
    name: 'target_group',
    type: 'enum',
    enum: MembershipStatus,
    array: true,
    nullable: true,
  })
  targetGroup?: MembershipStatus[];

  @Column({ name: 'requires_rsvp', default: true })
  requiresRsvp: boolean;

  @Column({ name: 'send_notification', default: true })
  sendNotification: boolean;

  @Column({ name: 'reminder_minutes', default: 60 })
  reminderMinutes: number;

  @Column({ name: 'is_cancelled', default: false })
  isCancelled: boolean;

  @OneToMany(() => EventRsvp, (rsvp) => rsvp.event)
  rsvps?: EventRsvp[];

  @OneToMany(() => EventAttendance, (att) => att.event)
  attendance?: EventAttendance[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
