import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BudgetPosition } from './budget-position.entity';
import { AcquisitionInvoice } from './acquisition-invoice.entity';

@Entity('acquisitions')
export class Acquisition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'budget_position_id' })
  budgetPositionId: string;

  @ManyToOne(() => BudgetPosition, (bp) => bp.acquisitions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_position_id' })
  budgetPosition: BudgetPosition;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  value: number;

  @Column({ name: 'is_full_purchase', type: 'boolean', default: false })
  isFullPurchase: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referat: string;

  @Column({ name: 'caiet_de_sarcini', type: 'varchar', length: 500, nullable: true })
  caietDeSarcini: string;

  @Column({ name: 'nota_justificativa', type: 'varchar', length: 500, nullable: true })
  notaJustificativa: string;

  @Column({ name: 'contract_number', type: 'varchar', length: 500, nullable: true })
  contractNumber: string;

  @Column({ name: 'contract_date', type: 'date', nullable: true })
  contractDate: Date;

  @Column({ name: 'ordin_incepere', type: 'varchar', length: 500, nullable: true })
  ordinIncepere: string;

  @Column({ name: 'proces_verbal_receptie', type: 'varchar', length: 500, nullable: true })
  procesVerbalReceptie: string;

  @Column({ name: 'is_service_contract', type: 'boolean', default: false })
  isServiceContract: boolean;

  @Column({ name: 'service_months', type: 'int', nullable: true })
  serviceMonths: number;

  @Column({ name: 'service_start_date', type: 'date', nullable: true })
  serviceStartDate: Date;

  @Column({ name: 'reception_day', type: 'int', nullable: true })
  receptionDay: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => AcquisitionInvoice, (invoice) => invoice.acquisition)
  invoices: AcquisitionInvoice[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
