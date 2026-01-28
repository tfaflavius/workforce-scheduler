import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { ScheduleAssignment } from './schedule-assignment.entity';

@Entity('work_schedules')
export class WorkSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'uuid', name: 'department_id', nullable: true })
  departmentId: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ type: 'integer' })
  month: number; // 1-12

  @Column({ type: 'integer' })
  year: number; // 2024+

  @Column({ type: 'varchar', length: 20, name: 'shift_pattern' })
  shiftPattern: string; // SHIFT_8H or SHIFT_12H

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: string; // DRAFT, PENDING_APPROVAL, APPROVED, ACTIVE, ARCHIVED

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'uuid', name: 'approved_by_admin', nullable: true })
  approvedByAdmin: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_admin' })
  approver: User;

  @Column({ type: 'timestamp', name: 'approved_at', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason: string;

  @OneToMany(() => ScheduleAssignment, (assignment) => assignment.schedule)
  assignments: ScheduleAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual property pentru compatibilitate cu frontend
  get monthYear(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }
}
