import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PvDisplayDay } from './pv-display-day.entity';
import { PvDisplaySessionComment } from './pv-display-session-comment.entity';
import { PvSessionStatus } from '../constants/parking.constants';

@Entity('pv_display_sessions')
export class PvDisplaySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, default: 'DRAFT' })
  status: PvSessionStatus;

  // Format: "2025-01" (anul-luna)
  @Column({ name: 'month_year', length: 10 })
  monthYear: string;

  // Descriere optionala a sesiunii
  @Column({ type: 'text', nullable: true })
  description: string;

  // Audit fields
  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'last_modified_by', nullable: true })
  lastModifiedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_modified_by' })
  lastModifier: User;

  @OneToMany(() => PvDisplayDay, (day) => day.session)
  days: PvDisplayDay[];

  @OneToMany(() => PvDisplaySessionComment, (comment) => comment.session)
  comments: PvDisplaySessionComment[];
}
