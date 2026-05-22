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

/**
 * Visual category coming from the canonical Google My Maps:
 *  YELLOW = "solare noi" (new solar batch)
 *  PINK = older numbered batch (Parcometrul 31+)
 *  BLUE = legacy street-named batch
 * Kept separate from `zone` because zone refers to parking tariff
 * zones (rosu/galben/alb), not to map visualisation.
 */
export enum ParkingMeterSourceColor {
  YELLOW = 'YELLOW',
  PINK = 'PINK',
  BLUE = 'BLUE',
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

  /**
   * Original My Maps marker colour. Used purely for rendering on the map
   * so the in-app layout mirrors the canonical Google My Maps document.
   */
  @Column({
    type: 'enum',
    enum: ParkingMeterSourceColor,
    name: 'source_color',
    nullable: true,
  })
  sourceColor: ParkingMeterSourceColor | null;

  /**
   * True when the source map marker has the ⚡ lightning bolt symbol —
   * means the meter has access to mains electricity.
   */
  @Column({ name: 'has_electric_supply', default: false })
  hasElectricSupply: boolean;

  /**
   * Link to the canonical Google My Maps document (shared link). All
   * meters imported from the same map share the same URL so users can
   * jump from the in-app map back to the source for verification.
   */
  @Column({ name: 'external_map_url', length: 500, nullable: true })
  externalMapUrl: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
