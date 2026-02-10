import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type ParkingHistoryEntityType = 'ISSUE' | 'DAMAGE' | 'COLLECTION' | 'HANDICAP_REQUEST';
export type ParkingHistoryAction = 'CREATED' | 'UPDATED' | 'RESOLVED' | 'DELETED';

@Entity('parking_history')
export class ParkingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type', length: 50 })
  entityType: ParkingHistoryEntityType;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ length: 50 })
  action: ParkingHistoryAction;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
