import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Acquisition } from './acquisition.entity';

export type BudgetCategory = 'INVESTMENTS' | 'CURRENT_EXPENSES';

@Entity('budget_positions')
export class BudgetPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar', length: 50 })
  category: BudgetCategory;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => Acquisition, (acquisition) => acquisition.budgetPosition)
  acquisitions: Acquisition[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
