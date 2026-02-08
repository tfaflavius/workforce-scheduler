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
import { ParkingLot } from './parking-lot.entity';
import { CashCollection } from './cash-collection.entity';

@Entity('payment_machines')
export class PaymentMachine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parking_lot_id' })
  parkingLotId: string;

  @Column({ name: 'machine_number', length: 10 })
  machineNumber: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ParkingLot, (lot) => lot.paymentMachines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot: ParkingLot;

  @OneToMany(() => CashCollection, (collection) => collection.paymentMachine)
  cashCollections: CashCollection[];
}
