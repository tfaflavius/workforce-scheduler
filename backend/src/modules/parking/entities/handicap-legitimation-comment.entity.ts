import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { HandicapLegitimation } from './handicap-legitimation.entity';

@Entity('handicap_legitimation_comments')
export class HandicapLegitimationComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'legitimation_id' })
  legitimationId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => HandicapLegitimation, (legitimation) => legitimation.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'legitimation_id' })
  legitimation: HandicapLegitimation;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
