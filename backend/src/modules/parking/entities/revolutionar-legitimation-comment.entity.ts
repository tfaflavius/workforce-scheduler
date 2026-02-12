import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RevolutionarLegitimation } from './revolutionar-legitimation.entity';

@Entity('revolutionar_legitimation_comments')
export class RevolutionarLegitimationComment {
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
  @ManyToOne(() => RevolutionarLegitimation, (legitimation) => legitimation.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'legitimation_id' })
  legitimation: RevolutionarLegitimation;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
