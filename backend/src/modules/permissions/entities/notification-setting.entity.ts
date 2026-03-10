import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { UserRole } from '../../users/entities/user.entity';

@Entity('notification_settings')
@Unique(['notificationType', 'role'])
@Index('IDX_notification_setting_type_role', ['notificationType', 'role'])
export class NotificationSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'notification_type',
    type: 'varchar',
    length: 50,
  })
  notificationType: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ name: 'in_app_enabled', default: true })
  inAppEnabled: boolean;

  @Column({ name: 'push_enabled', default: true })
  pushEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
