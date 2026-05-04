import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
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
  // Parking damage notifications
  PARKING_DAMAGE_ASSIGNED = 'PARKING_DAMAGE_ASSIGNED',
  PARKING_DAMAGE_RESOLVED = 'PARKING_DAMAGE_RESOLVED',
  // Handicap request notifications
  HANDICAP_REQUEST_ASSIGNED = 'HANDICAP_REQUEST_ASSIGNED',
  HANDICAP_REQUEST_RESOLVED = 'HANDICAP_REQUEST_RESOLVED',
  // Domiciliu request notifications
  DOMICILIU_REQUEST_ASSIGNED = 'DOMICILIU_REQUEST_ASSIGNED',
  DOMICILIU_REQUEST_RESOLVED = 'DOMICILIU_REQUEST_RESOLVED',
  DOMICILIU_REQUEST_DEADLINE_APPROACHING = 'DOMICILIU_REQUEST_DEADLINE_APPROACHING',
  // Legitimation notifications
  LEGITIMATION_ASSIGNED = 'LEGITIMATION_ASSIGNED',
  LEGITIMATION_RESOLVED = 'LEGITIMATION_RESOLVED',
  // PV session notifications
  PV_SESSION_ASSIGNED = 'PV_SESSION_ASSIGNED',
  PV_SESSION_UPDATED = 'PV_SESSION_UPDATED',
  // Edit request notifications
  EDIT_REQUEST_CREATED = 'EDIT_REQUEST_CREATED',
  EDIT_REQUEST_APPROVED = 'EDIT_REQUEST_APPROVED',
  EDIT_REQUEST_REJECTED = 'EDIT_REQUEST_REJECTED',
  // Daily report notifications
  DAILY_REPORT_SUBMITTED = 'DAILY_REPORT_SUBMITTED',
  DAILY_REPORT_COMMENTED = 'DAILY_REPORT_COMMENTED',
  DAILY_REPORT_MISSING = 'DAILY_REPORT_MISSING',
  // Time tracking notifications
  TIME_ENTRY_MISMATCH = 'TIME_ENTRY_MISMATCH',
  GPS_STATUS_ALERT = 'GPS_STATUS_ALERT',
  // Control sesizari notifications
  CONTROL_SESIZARE_ASSIGNED = 'CONTROL_SESIZARE_ASSIGNED',
  CONTROL_SESIZARE_RESOLVED = 'CONTROL_SESIZARE_RESOLVED',
}

@Entity('notifications')
@Index('IDX_notification_user_read', ['userId', 'isRead'])
@Index('IDX_notification_user_created', ['userId', 'createdAt'])
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
