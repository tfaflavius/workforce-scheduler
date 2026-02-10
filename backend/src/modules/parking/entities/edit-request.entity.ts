import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type EditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type EditRequestType = 'PARKING_ISSUE' | 'PARKING_DAMAGE' | 'CASH_COLLECTION';

@Entity('edit_requests')
export class EditRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_type', length: 50 })
  requestType: EditRequestType;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ type: 'jsonb', name: 'proposed_changes' })
  proposedChanges: Record<string, { from: any; to: any }>;

  @Column({ type: 'jsonb', name: 'original_data' })
  originalData: Record<string, any>;

  @Column({ length: 20, default: 'PENDING' })
  status: EditRequestStatus;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by' })
  requester: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;
}
