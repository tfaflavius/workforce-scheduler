import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { UserRole } from '../../users/entities/user.entity';

export enum RecipientType {
  ROLE = 'ROLE',
  DEPARTMENT = 'DEPARTMENT',
  CREATOR = 'CREATOR',
  ASSIGNED = 'ASSIGNED',
  ADMIN_ALL = 'ADMIN_ALL',
  MANAGER_ALL = 'MANAGER_ALL',
}

@Entity('email_notification_rules')
export class EmailNotificationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @Column({ name: 'event_action', type: 'varchar', length: 100 })
  eventAction: string;

  @Column({ name: 'recipient_type', type: 'varchar', length: 50 })
  recipientType: RecipientType;

  @Column({ name: 'recipient_role', type: 'enum', enum: UserRole, nullable: true })
  recipientRole: UserRole | null;

  @Column({ name: 'recipient_department_id', type: 'uuid', nullable: true })
  recipientDepartmentId: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recipient_department_id' })
  recipientDepartment: Department;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ name: 'send_immediate', default: true })
  sendImmediate: boolean;

  @Column({ name: 'cron_schedule', type: 'varchar', length: 100, nullable: true })
  cronSchedule: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
