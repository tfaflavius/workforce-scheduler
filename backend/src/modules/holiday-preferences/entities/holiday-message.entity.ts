import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HolidayPeriod } from './holiday-period.entity';
import { User } from '../../users/entities/user.entity';

/** Mesaj in chat-ul unei perioade de sarbatori (obiectii, intelegeri intre colegi). */
@Entity('holiday_messages')
@Index('IDX_holiday_messages_period_group', ['periodId', 'groupKey', 'createdAt'])
export class HolidayMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'period_id', type: 'uuid' })
  periodId: string;

  @ManyToOne(() => HolidayPeriod, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  period: HolidayPeriod;

  /** Grupul (departamentul) in care a fost scris mesajul - fiecare grup are discutia lui. */
  @Column({ name: 'group_key', type: 'varchar', length: 60 })
  groupKey: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
