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

/**
 * Stores the latest uploaded Excel document with the parking investments list.
 * Only one row exists at a time — re-upload replaces the existing row.
 *
 * The original file bytes are stored verbatim in `file_data` (bytea) so that
 * the source spreadsheet is preserved 1:1 — the client parses it for display
 * and can download the original file at any time.
 */
@Entity('investment_documents')
export class InvestmentDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  /**
   * Raw Excel bytes. PG bytea — kept verbatim so nothing is lost.
   * Files are typically < 1 MB so this is a fine trade-off vs. external storage.
   */
  @Column({ name: 'file_data', type: 'bytea' })
  fileData: Buffer;

  @Column({ name: 'uploaded_by_id' })
  uploadedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
