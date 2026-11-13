import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HolidayPeriod } from './holiday-period.entity';
import { User } from '../../users/entities/user.entity';

/** LEAVE = vrea concediu, DAY = prefera tura de zi, NIGHT = prefera noapte, ANY = disponibil oricum */
export type HolidayChoice = 'LEAVE' | 'DAY' | 'NIGHT' | 'ANY';
export const HOLIDAY_CHOICES: HolidayChoice[] = ['LEAVE', 'DAY', 'NIGHT', 'ANY'];

@Entity('holiday_preferences')
@Index('UQ_holiday_pref_period_user_date', ['periodId', 'userId', 'date'], { unique: true })
export class HolidayPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'period_id', type: 'uuid' })
  periodId: string;

  @ManyToOne(() => HolidayPeriod, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  period: HolidayPeriod;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 10 })
  choice: HolidayChoice;

  @Column({ type: 'varchar', length: 300, nullable: true })
  note: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
