import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PaymentMachine } from './payment-machine.entity';
import { ParkingIssue } from './parking-issue.entity';
import { ParkingDamage } from './parking-damage.entity';
import { CashCollection } from './cash-collection.entity';

@Entity('parking_lots')
export class ParkingLot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 500, nullable: true })
  address: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => PaymentMachine, (machine) => machine.parkingLot)
  paymentMachines: PaymentMachine[];

  @OneToMany(() => ParkingIssue, (issue) => issue.parkingLot)
  issues: ParkingIssue[];

  @OneToMany(() => ParkingDamage, (damage) => damage.parkingLot)
  damages: ParkingDamage[];

  @OneToMany(() => CashCollection, (collection) => collection.parkingLot)
  cashCollections: CashCollection[];
}
