import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import {
  AvailabilityStatus,
  MembershipStatus,
} from '../../common/enums/roles.enum';
import { UserRole } from './user-role.entity';

@Entity('users')
@Unique(['organizationId', 'email'])
@Unique(['organizationId', 'username'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  /** Prijavno ime (ime.priimek), unikatno znotraj društva — generira se samodejno. */
  @Column({ length: 100 })
  username: string;

  /** Neobvezna — člani je nimajo nujno; obvezna le za admina društva. */
  @Column({ nullable: true, length: 255 })
  @Index()
  email?: string;

  /** Nikoli ne serializiraj v API odgovorih — glej UsersService.sanitize(). */
  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ nullable: true, length: 50 })
  phone?: string;

  @Column({ nullable: true, length: 255 })
  address?: string;

  @Column({ nullable: true, length: 100 })
  city?: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: string;

  @Column({ name: 'photo_url', nullable: true, length: 500 })
  photoUrl?: string;

  @Column({
    name: 'membership_status',
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.OPERATIVE,
  })
  membershipStatus: MembershipStatus;

  @Column({ nullable: true, length: 50 })
  rank?: string;

  @Column({ name: 'membership_number', nullable: true, length: 50 })
  membershipNumber?: string;

  @Column({ name: 'joined_at', type: 'date', nullable: true })
  joinedAt?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: AvailabilityStatus,
    default: AvailabilityStatus.AVAILABLE,
  })
  availability: AvailabilityStatus;

  /** Nikoli ne serializiraj v API odgovorih. */
  @Column({ name: 'fcm_token', nullable: true, length: 500, select: false })
  fcmToken?: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date;

  @Column({
    name: 'password_reset_token',
    nullable: true,
    length: 255,
    select: false,
  })
  passwordResetToken?: string;

  @Column({ name: 'password_reset_expires', type: 'timestamptz', nullable: true, select: false })
  passwordResetExpires?: Date;

  @OneToMany(() => UserRole, (role) => role.user, { cascade: true })
  roles?: UserRole[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
