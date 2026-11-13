import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type HolidayPeriodKey = 'CRACIUN' | 'REVELION' | 'PASTE';
export type HolidayPeriodStatus = 'OPEN' | 'LOCKED';

/**
 * Perioada de sarbatori pentru care dispecerii isi aleg preferintele
 * (Craciun / Revelion / Paste). Perioadele se genereaza automat pe an; managerul
 * sau adminul pot ajusta datele si pot bloca perioada dupa ce s-au pus de acord.
 */
@Entity('holiday_periods')
@Index('UQ_holiday_period_key_year', ['key', 'year'], { unique: true })
export class HolidayPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  key: HolidayPeriodKey;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'varchar', length: 10, default: 'OPEN' })
  status: HolidayPeriodStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
