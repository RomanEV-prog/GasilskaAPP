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
import { SystemRole } from '../../common/enums/roles.enum';
import { User } from './user.entity';

@Entity('user_roles')
@Unique(['userId', 'organizationId', 'role'])
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'enum', enum: SystemRole, default: SystemRole.MEMBER })
  role: SystemRole;

  @ManyToOne(() => User, (user) => user.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
