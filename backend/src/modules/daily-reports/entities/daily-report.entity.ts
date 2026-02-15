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

export enum DailyReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
}

@Entity('daily_reports')
@Unique(['userId', 'date'])
export class DailyReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: DailyReportStatus.DRAFT,
  })
  status: DailyReportStatus;

  @Column({ name: 'admin_comment', type: 'text', nullable: true })
  adminComment: string;

  @Column({ name: 'admin_commented_at', type: 'timestamp', nullable: true })
  adminCommentedAt: Date;

  @Column({ name: 'admin_commented_by', type: 'uuid', nullable: true })
  adminCommentedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'admin_commented_by' })
  adminCommentedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
