import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Acquisition } from './acquisition.entity';

@Entity('acquisition_invoices')
export class AcquisitionInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'acquisition_id' })
  acquisitionId: string;

  @ManyToOne(() => Acquisition, (acq) => acq.invoices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'acquisition_id' })
  acquisition: Acquisition;

  @Column({ name: 'invoice_number', type: 'varchar', length: 100 })
  invoiceNumber: string;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ name: 'month_number', type: 'int', nullable: true })
  monthNumber: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
