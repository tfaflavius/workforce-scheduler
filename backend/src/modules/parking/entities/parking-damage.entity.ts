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
import { User } from '../../users/entities/user.entity';
import { ParkingDamageComment } from './parking-damage-comment.entity';

export type ParkingDamageStatus = 'ACTIVE' | 'FINALIZAT';
export type DamageResolutionType = 'RECUPERAT' | 'TRIMIS_JURIDIC';

@Entity('parking_damages')
export class ParkingDamage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parking_lot_id' })
  parkingLotId: string;

  @Column({ name: 'damaged_equipment', length: 255 })
  damagedEquipment: string;

  @Column({ name: 'person_name', length: 255 })
  personName: string;

  @Column({ length: 50 })
  phone: string;

  @Column({ name: 'car_plate', length: 20 })
  carPlate: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'signature_data', type: 'text', nullable: true })
  signatureData: string;

  @Column({ length: 20, default: 'ACTIVE' })
  status: ParkingDamageStatus;

  @Column({ name: 'resolution_type', length: 50, nullable: true })
  resolutionType: DamageResolutionType;

  @Column({ name: 'resolution_description', type: 'text', nullable: true })
  resolutionDescription: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string;

  @Column({ name: 'last_modified_by', nullable: true })
  lastModifiedBy: string;

  @Column({ name: 'is_urgent', default: false })
  isUrgent: boolean;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ParkingLot, (lot) => lot.damages, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot: ParkingLot;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_modified_by' })
  lastModifier: User;

  @OneToMany(() => ParkingDamageComment, (comment) => comment.damage)
  comments: ParkingDamageComment[];
}
