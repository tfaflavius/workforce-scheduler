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
 * sau adminul pot ajusta datele si pot inchide perioada pe fiecare departament.
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

  /** Pastrat pentru compatibilitate; inchiderea se face acum pe grup (lockedGroups). */
  @Column({ type: 'varchar', length: 10, default: 'OPEN' })
  status: HolidayPeriodStatus;

  /** Grupurile (departamentele) pentru care perioada este inchisa. */
  @Column({ name: 'locked_groups', type: 'jsonb', default: () => "'[]'" })
  lockedGroups: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
