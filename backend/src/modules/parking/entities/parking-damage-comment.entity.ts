import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ParkingDamage } from './parking-damage.entity';
import { User } from '../../users/entities/user.entity';

@Entity('parking_damage_comments')
export class ParkingDamageComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'damage_id' })
  damageId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ParkingDamage, (damage) => damage.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'damage_id' })
  damage: ParkingDamage;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
