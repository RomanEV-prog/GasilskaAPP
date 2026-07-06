import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Event } from './event.entity';

@Entity('event_attendance')
@Unique(['eventId', 'userId'])
export class EventAttendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id' })
  @Index()
  eventId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Event, (event) => event.attendance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event?: Event;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ default: false })
  present: boolean;

  @Column({ name: 'marked_by', nullable: true })
  markedBy?: string;

  @CreateDateColumn({ name: 'marked_at', type: 'timestamptz' })
  markedAt: Date;
}
