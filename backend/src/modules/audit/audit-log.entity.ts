import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', nullable: true })
  @Index()
  organizationId?: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  /** CREATE | UPDATE | DELETE */
  @Column({ length: 50 })
  action: string;

  /** users, events, vehicles ... (segment poti) */
  @Column({ length: 100 })
  entity: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId?: string;

  @Column({ name: 'old_data', type: 'jsonb', nullable: true })
  oldData?: Record<string, any>;

  @Column({ name: 'new_data', type: 'jsonb', nullable: true })
  newData?: Record<string, any>;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
