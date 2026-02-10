import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HandicapRequest } from './handicap-request.entity';
import { User } from '../../users/entities/user.entity';

@Entity('handicap_request_comments')
export class HandicapRequestComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id' })
  requestId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => HandicapRequest, (request) => request.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: HandicapRequest;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
