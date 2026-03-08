import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { UserRole } from '../../users/entities/user.entity';

@Entity('permissions')
@Unique(['resourceKey', 'action', 'role', 'departmentId'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_key', type: 'varchar', length: 100 })
  resourceKey: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ default: true })
  allowed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
