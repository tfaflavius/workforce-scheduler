import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TimeEntry } from './time-entry.entity';

@Entity('location_logs')
export class LocationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'time_entry_id' })
  timeEntryId: string;

  @ManyToOne(() => TimeEntry, (entry) => entry.locationLogs)
  @JoinColumn({ name: 'time_entry_id' })
  timeEntry: TimeEntry;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  accuracy: number;

  @Column({ type: 'timestamp', name: 'recorded_at' })
  recordedAt: Date;

  @Column({ type: 'boolean', default: true, name: 'is_auto_recorded' })
  isAutoRecorded: boolean;

  @Column({ type: 'text', nullable: true })
  address: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
