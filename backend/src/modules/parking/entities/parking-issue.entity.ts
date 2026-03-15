import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ParkingLot } from './parking-lot.entity';
import { User } from '../../users/entities/user.entity';
import { ParkingIssueComment } from './parking-issue-comment.entity';

export type ParkingIssueStatus = 'ACTIVE' | 'FINALIZAT';

@Entity('parking_issues')
@Index('IDX_issue_status', ['status'])
@Index('IDX_issue_parking_lot', ['parkingLotId'])
@Index('IDX_issue_urgent', ['isUrgent'])
@Index('IDX_issue_created_by', ['createdBy'])
@Index('IDX_issue_assigned_to', ['assignedTo'])
@Index('IDX_issue_created_at', ['createdAt'])
export class ParkingIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parking_lot_id' })
  parkingLotId: string;

  @Column({ length: 255 })
  equipment: string;

  @Column({ name: 'contacted_company', length: 255 })
  contactedCompany: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 20, default: 'ACTIVE' })
  status: ParkingIssueStatus;

  @Column({ name: 'resolution_description', type: 'text', nullable: true })
  resolutionDescription: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string;

  @Column({ name: 'last_modified_by', nullable: true })
  lastModifiedBy: string;

  @Column({ name: 'is_urgent', default: false })
  isUrgent: boolean;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ParkingLot, (lot) => lot.issues, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot: ParkingLot;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_modified_by' })
  lastModifier: User;

  @OneToMany(() => ParkingIssueComment, (comment) => comment.issue)
  comments: ParkingIssueComment[];
}
