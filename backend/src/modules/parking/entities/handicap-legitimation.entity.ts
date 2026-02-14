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
import { HandicapLegitimationComment } from './handicap-legitimation-comment.entity';
import { HandicapLegitimationStatus } from '../constants/parking.constants';

@Entity('handicap_legitimations')
export class HandicapLegitimation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, default: 'ACTIVE' })
  status: HandicapLegitimationStatus;

  // Date persoana
  @Column({ name: 'person_name', length: 255 })
  personName: string;

  @Column({ length: 20, nullable: true })
  cnp: string;

  @Column({ name: 'handicap_certificate_number', length: 100 })
  handicapCertificateNumber: string;

  @Column({ name: 'car_plate', length: 20 })
  carPlate: string;

  @Column({ name: 'auto_number', length: 50, nullable: true })
  autoNumber: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  // Descriere
  @Column({ type: 'text', nullable: true })
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

  @OneToMany(() => HandicapLegitimationComment, (comment) => comment.legitimation)
  comments: HandicapLegitimationComment[];
}
