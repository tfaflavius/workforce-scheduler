import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ParkingZone {
  ROSU = 'ROSU',
  GALBEN = 'GALBEN',
  ALB = 'ALB',
}

export enum PowerSource {
  CURENT = 'CURENT',
  SOLAR = 'SOLAR',
}

export enum MeterCondition {
  NOU = 'NOU',
  VECHI = 'VECHI',
}

@Entity('parking_meters')
export class ParkingMeter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ length: 500, nullable: true })
  address: string;

  @Column({ type: 'enum', enum: ParkingZone, default: ParkingZone.ALB })
  zone: ParkingZone;

  @Column({ type: 'enum', enum: PowerSource, name: 'power_source', default: PowerSource.CURENT })
  powerSource: PowerSource;

  @Column({ type: 'enum', enum: MeterCondition, default: MeterCondition.NOU })
  condition: MeterCondition;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
