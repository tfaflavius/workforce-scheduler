import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('generated_reports')
export class GeneratedReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_type', length: 50 })
  reportType: string; // 'SCHEDULE_PDF' | 'SCHEDULE_EXCEL'

  @Column({ length: 10 })
  format: string; // 'PDF' | 'EXCEL'

  @Column({ name: 'generated_by', type: 'uuid' })
  generatedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'generated_by' })
  generator: User;

  @Column({ type: 'jsonb' })
  parameters: Record<string, any>; // { scheduleId, includeViolations, etc. }

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string; // MinIO URL

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
