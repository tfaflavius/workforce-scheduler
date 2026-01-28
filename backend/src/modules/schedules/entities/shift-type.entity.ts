import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('shift_types')
export class ShiftType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, name: 'shift_pattern' })
  shiftPattern: string; // SHIFT_8H or SHIFT_12H

  @Column({ type: 'time', name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', name: 'end_time' })
  endTime: string;

  @Column({ type: 'decimal', precision: 4, scale: 2, name: 'duration_hours' })
  durationHours: number;

  @Column({ type: 'boolean', name: 'is_night_shift', default: false })
  isNightShift: boolean;

  @Column({ type: 'integer', name: 'display_order', nullable: true })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
