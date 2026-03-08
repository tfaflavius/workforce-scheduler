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

@Entity('task_flow_rules')
export class TaskFlowRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_type', type: 'varchar', length: 100 })
  taskType: string;

  @Column({ name: 'creator_role', type: 'enum', enum: UserRole, nullable: true })
  creatorRole: UserRole | null;

  @Column({ name: 'creator_department_id', type: 'uuid', nullable: true })
  creatorDepartmentId: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creator_department_id' })
  creatorDepartment: Department;

  @Column({ name: 'receiver_role', type: 'enum', enum: UserRole, nullable: true })
  receiverRole: UserRole | null;

  @Column({ name: 'receiver_department_id', type: 'uuid', nullable: true })
  receiverDepartmentId: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'receiver_department_id' })
  receiverDepartment: Department;

  @Column({ name: 'resolver_role', type: 'enum', enum: UserRole, nullable: true })
  resolverRole: UserRole | null;

  @Column({ name: 'resolver_department_id', type: 'uuid', nullable: true })
  resolverDepartmentId: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolver_department_id' })
  resolverDepartment: Department;

  @Column({ name: 'auto_assign', default: false })
  autoAssign: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
