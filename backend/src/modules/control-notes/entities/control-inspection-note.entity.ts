import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Stores how many "note de constatare" each Control parking user issued
 * per month. Data is entered by Parcometre department users (they have
 * access to the system that shows daily note counts per agent).
 *
 * One row per user/year/month — upserts overwrite the existing row.
 */
@Entity('control_inspection_notes')
@Unique('UQ_control_notes_user_year_month', ['userId', 'year', 'month'])
@Index('IDX_control_notes_year_month', ['year', 'month'])
export class ControlInspectionNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  year: number;

  /** 1-12 */
  @Column({ type: 'int' })
  month: number;

  /** Total notes issued by this user during the month */
  @Column({ type: 'int' })
  count: number;

  /** Free-text marker for special situations (e.g. 'CO' = concediu) */
  @Column({ type: 'varchar', length: 20, nullable: true })
  marker: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
