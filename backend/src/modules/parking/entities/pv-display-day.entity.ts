import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PvDisplaySession } from './pv-display-session.entity';
import { PvDayStatus } from '../constants/parking.constants';

@Entity('pv_display_days')
export class PvDisplayDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({ length: 20, default: 'OPEN' })
  status: PvDayStatus;

  // Data afisarii
  @Column({ name: 'display_date', type: 'date' })
  displayDate: Date;

  // Numarul zilei in sesiune (1-5)
  @Column({ name: 'day_order', type: 'int' })
  dayOrder: number;

  // Numar procese verbale de afisat (minim 30)
  @Column({ name: 'notice_count', type: 'int', default: 30 })
  noticeCount: number;

  // Seria si numarul primului/ultimului proces verbal
  @Column({ name: 'first_notice_series', length: 20, nullable: true })
  firstNoticeSeries: string;

  @Column({ name: 'first_notice_number', length: 30, nullable: true })
  firstNoticeNumber: string;

  @Column({ name: 'last_notice_series', length: 20, nullable: true })
  lastNoticeSeries: string;

  @Column({ name: 'last_notice_number', length: 30, nullable: true })
  lastNoticeNumber: string;

  // Range date procese verbale
  @Column({ name: 'notices_date_from', type: 'date', nullable: true })
  noticesDateFrom: Date;

  @Column({ name: 'notices_date_to', type: 'date', nullable: true })
  noticesDateTo: Date;

  // Useri Control asignati (marketplace - max 2)
  @Column({ name: 'control_user1_id', nullable: true })
  controlUser1Id: string;

  @Column({ name: 'control_user1_claimed_at', type: 'timestamptz', nullable: true })
  controlUser1ClaimedAt: Date;

  @Column({ name: 'control_user2_id', nullable: true })
  controlUser2Id: string;

  @Column({ name: 'control_user2_claimed_at', type: 'timestamptz', nullable: true })
  controlUser2ClaimedAt: Date;

  // Finalizare
  @Column({ name: 'completion_observations', type: 'text', nullable: true })
  completionObservations: string;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ name: 'completed_by', nullable: true })
  completedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => PvDisplaySession, (session) => session.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: PvDisplaySession;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'control_user1_id' })
  controlUser1: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'control_user2_id' })
  controlUser2: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'completed_by' })
  completedByUser: User;

  // Helper computed: cate sloturi sunt ocupate
  get assignedCount(): number {
    let count = 0;
    if (this.controlUser1Id) count++;
    if (this.controlUser2Id) count++;
    return count;
  }
}
