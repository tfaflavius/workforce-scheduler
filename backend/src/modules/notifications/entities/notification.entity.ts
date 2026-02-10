import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  SCHEDULE_CREATED = 'SCHEDULE_CREATED',
  SCHEDULE_UPDATED = 'SCHEDULE_UPDATED',
  SCHEDULE_APPROVED = 'SCHEDULE_APPROVED',
  SCHEDULE_REJECTED = 'SCHEDULE_REJECTED',
  SHIFT_REMINDER = 'SHIFT_REMINDER',
  SHIFT_SWAP_REQUEST = 'SHIFT_SWAP_REQUEST',
  SHIFT_SWAP_RESPONSE = 'SHIFT_SWAP_RESPONSE',
  SHIFT_SWAP_APPROVED = 'SHIFT_SWAP_APPROVED',
  SHIFT_SWAP_REJECTED = 'SHIFT_SWAP_REJECTED',
  SHIFT_SWAP_ACCEPTED = 'SHIFT_SWAP_ACCEPTED',
  EMPLOYEE_ABSENT = 'EMPLOYEE_ABSENT',
  GENERAL = 'GENERAL',
  // Leave request notifications
  LEAVE_REQUEST_CREATED = 'LEAVE_REQUEST_CREATED',
  LEAVE_REQUEST_APPROVED = 'LEAVE_REQUEST_APPROVED',
  LEAVE_REQUEST_REJECTED = 'LEAVE_REQUEST_REJECTED',
  LEAVE_OVERLAP_WARNING = 'LEAVE_OVERLAP_WARNING',
  // Parking notifications
  PARKING_ISSUE_ASSIGNED = 'PARKING_ISSUE_ASSIGNED',
  PARKING_ISSUE_RESOLVED = 'PARKING_ISSUE_RESOLVED',
  // Edit request notifications
  EDIT_REQUEST_CREATED = 'EDIT_REQUEST_CREATED',
  EDIT_REQUEST_APPROVED = 'EDIT_REQUEST_APPROVED',
  EDIT_REQUEST_REJECTED = 'EDIT_REQUEST_REJECTED',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', nullable: true })
  readAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
