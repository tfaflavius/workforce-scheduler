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

@Entity('parking_weekly_occupancies')
@Unique(['weekStart', 'locationKey'])
export class ParkingWeeklyOccupancy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'week_start', type: 'date' })
  weekStart: string; // Monday of the week (YYYY-MM-DD)

  @Column({ name: 'location_key', type: 'varchar', length: 50 })
  locationKey: string;

  @Column({ name: 'min_occupancy', type: 'integer', default: 0 })
  minOccupancy: number;

  @Column({ name: 'max_occupancy', type: 'integer', default: 0 })
  maxOccupancy: number;

  @Column({ name: 'avg_occupancy', type: 'decimal', precision: 10, scale: 2, default: 0 })
  avgOccupancy: number;

  @Column({ name: 'hourly_rate', type: 'decimal', precision: 10, scale: 4, default: 0 })
  hourlyRate: number; // Calculated: avgOccupancy / 168

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
