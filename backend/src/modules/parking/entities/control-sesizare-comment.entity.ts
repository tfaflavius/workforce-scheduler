import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ControlSesizare } from './control-sesizare.entity';
import { User } from '../../users/entities/user.entity';

@Entity('control_sesizare_comments')
export class ControlSesizareComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sesizare_id' })
  sesizareId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ControlSesizare, (sesizare) => sesizare.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sesizare_id' })
  sesizare: ControlSesizare;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
