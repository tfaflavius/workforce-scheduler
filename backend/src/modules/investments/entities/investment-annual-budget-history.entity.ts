import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Audit log for changes to the annual investment budget envelope.
 * One row per upsert — keeps the previous value and notes so users can
 * see who changed the budget, when, and what the previous figure was.
 */
@Entity('investment_annual_budget_history')
@Index('IDX_iabh_year_created_at', ['year', 'createdAt'])
export class InvestmentAnnualBudgetHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ name: 'old_amount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  oldAmount: number | null;

  @Column({ name: 'new_amount', type: 'decimal', precision: 18, scale: 2 })
  newAmount: number;

  @Column({ name: 'old_notes', type: 'text', nullable: true })
  oldNotes: string | null;

  @Column({ name: 'new_notes', type: 'text', nullable: true })
  newNotes: string | null;

  @Column({ name: 'changed_by_id' })
  changedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
