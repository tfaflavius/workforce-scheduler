import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkSchedule } from './work-schedule.entity';
import { User } from '../../users/entities/user.entity';
import { ShiftType } from './shift-type.entity';
import { WorkPosition } from './work-position.entity';

@Entity('schedule_assignments')
export class ScheduleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'work_schedule_id', nullable: true })
  workScheduleId: string;

  @ManyToOne(() => WorkSchedule, (schedule) => schedule.assignments)
  @JoinColumn({ name: 'work_schedule_id' })
  schedule: WorkSchedule;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'shift_type_id', nullable: true })
  shiftTypeId: string;

  @ManyToOne(() => ShiftType)
  @JoinColumn({ name: 'shift_type_id' })
  shiftType: ShiftType;

  @Column({ type: 'date', name: 'shift_date' })
  shiftDate: Date;

  @Column({ type: 'boolean', name: 'is_rest_day', default: false })
  isRestDay: boolean;

  @Column({ name: 'leave_type', nullable: true })
  leaveType: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', name: 'work_position_id', nullable: true })
  workPositionId: string;

  @ManyToOne(() => WorkPosition)
  @JoinColumn({ name: 'work_position_id' })
  workPosition: WorkPosition;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual properties for compatibility - computed from shiftType
  get startTime(): string {
    return this.shiftType?.startTime;
  }

  get endTime(): string {
    return this.shiftType?.endTime;
  }

  get durationHours(): number {
    return this.shiftType?.durationHours;
  }
}
