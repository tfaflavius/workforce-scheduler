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
import { User } from '../../users/entities/user.entity';
import { ControlSesizareComment } from './control-sesizare-comment.entity';
import { ControlSesizareType, ControlSesizareStatus, ControlSesizareZone } from '../constants/parking.constants';
import { ParkingLayoutType } from '../constants/parking.constants';

@Entity('control_sesizari')
export class ControlSesizare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  type: ControlSesizareType;

  @Column({ length: 20, default: 'ACTIVE' })
  status: ControlSesizareStatus;

  @Column({ length: 20 })
  zone: ControlSesizareZone;

  // Orientare - doar pentru MARCAJ, null pentru PANOU
  @Column({ length: 20, nullable: true })
  orientation: ParkingLayoutType;

  @Column({ type: 'text' })
  location: string;

  @Column({ name: 'google_maps_link', type: 'text', nullable: true })
  googleMapsLink: string;

  @Column({ type: 'text' })
  description: string;

  // Audit fields
  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string;

  @Column({ name: 'last_modified_by', nullable: true })
  lastModifiedBy: string;

  @Column({ name: 'resolution_description', type: 'text', nullable: true })
  resolutionDescription: string;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_modified_by' })
  lastModifier: User;

  @OneToMany(() => ControlSesizareComment, (comment) => comment.sesizare)
  comments: ControlSesizareComment[];
}
