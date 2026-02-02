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
import { User } from '../../users/entities/user.entity';
import { LeaveType } from './leave-request.entity';

@Entity('leave_balances')
@Unique(['userId', 'leaveType', 'year'])
export class LeaveBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'leave_type' })
  leaveType: LeaveType;

  @Column()
  year: number;

  @Column({ name: 'total_days', default: 21 })
  totalDays: number;

  @Column({ name: 'used_days', default: 0 })
  usedDays: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  get remainingDays(): number {
    return this.totalDays - this.usedDays;
  }
}
