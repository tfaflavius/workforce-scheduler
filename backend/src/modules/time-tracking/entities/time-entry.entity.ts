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
import { Task } from '../../tasks/entities/task.entity';
import { LocationLog } from './location-log.entity';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('time_entries')
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', nullable: true, name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'timestamp', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'end_time' })
  endTime: Date;

  @Column({ type: 'integer', nullable: true, name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ type: 'boolean', default: false, name: 'is_manual' })
  isManual: boolean;

  @Column({ type: 'text', nullable: true, name: 'manual_adjustment_reason' })
  manualAdjustmentReason: string;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by' })
  approvedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDING',
    name: 'approval_status',
  })
  approvalStatus: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'gps_status' })
  gpsStatus: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'last_gps_error' })
  lastGpsError: string;

  @Column({ type: 'timestamp', nullable: true, name: 'gps_status_updated_at' })
  gpsStatusUpdatedAt: Date;

  @OneToMany(() => LocationLog, (log) => log.timeEntry)
  locationLogs: LocationLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
