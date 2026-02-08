import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ParkingLot } from './parking-lot.entity';
import { PaymentMachine } from './payment-machine.entity';
import { User } from '../../users/entities/user.entity';

@Entity('cash_collections')
export class CashCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parking_lot_id' })
  parkingLotId: string;

  @Column({ name: 'payment_machine_id' })
  paymentMachineId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'collected_by' })
  collectedBy: string;

  @Column({ name: 'collected_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  collectedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => ParkingLot, (lot) => lot.cashCollections, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot: ParkingLot;

  @ManyToOne(() => PaymentMachine, (machine) => machine.cashCollections, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_machine_id' })
  paymentMachine: PaymentMachine;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'collected_by' })
  collector: User;
}
