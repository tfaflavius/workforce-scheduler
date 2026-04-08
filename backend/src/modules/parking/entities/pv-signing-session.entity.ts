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
import { PvSigningDay } from './pv-signing-day.entity';
import { PvSigningSessionComment } from './pv-signing-session-comment.entity';
import { PvSessionStatus } from '../constants/parking.constants';

@Entity('pv_signing_sessions')
export class PvSigningSession {
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

  @OneToMany(() => PvSigningDay, (day) => day.session)
  days: PvSigningDay[];

  @OneToMany(() => PvSigningSessionComment, (comment) => comment.session)
  comments: PvSigningSessionComment[];
}
