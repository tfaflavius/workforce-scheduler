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
import { User } from '../../users/entities/user.entity';

@Entity('parking_monthly_subscriptions')
@Unique(['monthYear', 'locationKey'])
export class ParkingMonthlySubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'month_year', type: 'varchar', length: 7 })
  monthYear: string; // Format: "2026-01"

  @Column({ name: 'location_key', type: 'varchar', length: 50 })
  locationKey: string;

  @Column({ name: 'subscription_count', type: 'integer', default: 0 })
  subscriptionCount: number;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
