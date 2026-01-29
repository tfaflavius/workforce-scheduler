import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from '../../users/entities/user.entity';

@Entity('task_history')
export class TaskHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'change_type' })
  changeType: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'field_name' })
  fieldName: string;

  @Column({ type: 'text', nullable: true, name: 'old_value' })
  oldValue: string;

  @Column({ type: 'text', nullable: true, name: 'new_value' })
  newValue: string;

  @Column({ type: 'uuid', nullable: true, name: 'changed_by' })
  changedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
