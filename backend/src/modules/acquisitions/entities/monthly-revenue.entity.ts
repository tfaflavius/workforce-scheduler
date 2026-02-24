import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { RevenueCategory } from './revenue-category.entity';

@Entity('monthly_revenues')
@Unique(['revenueCategoryId', 'year', 'month'])
export class MonthlyRevenue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'revenue_category_id' })
  revenueCategoryId: string;

  @ManyToOne(() => RevenueCategory, (rc) => rc.monthlyRevenues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'revenue_category_id' })
  revenueCategory: RevenueCategory;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  incasari: number;

  @Column({ name: 'incasari_card', type: 'decimal', precision: 15, scale: 2, default: 0 })
  incasariCard: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  cheltuieli: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
