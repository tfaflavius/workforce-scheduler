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
import { HandicapRequestComment } from './handicap-request-comment.entity';
import { HandicapRequestType, HandicapRequestStatus } from '../constants/parking.constants';

@Entity('handicap_requests')
export class HandicapRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_type', length: 30 })
  requestType: HandicapRequestType;

  @Column({ length: 20, default: 'ACTIVE' })
  status: HandicapRequestStatus;

  // Campuri comune pentru toate tipurile
  @Column({ type: 'text' })
  location: string;

  @Column({ name: 'google_maps_link', type: 'text', nullable: true })
  googleMapsLink: string;

  @Column({ type: 'text' })
  description: string;

  // Campuri specifice pentru AMPLASARE_PANOU si REVOCARE_PANOU
  // Nullable pentru CREARE_MARCAJ
  @Column({ name: 'person_name', length: 255, nullable: true })
  personName: string;

  @Column({ name: 'handicap_certificate_number', length: 100, nullable: true })
  handicapCertificateNumber: string;

  @Column({ name: 'car_plate', length: 20, nullable: true })
  carPlate: string;

  @Column({ name: 'auto_number', length: 50, nullable: true })
  autoNumber: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  // CNP - vizibil doar pentru Admin si departamentele Parcari Handicap/Domiciliu
  @Column({ length: 20, nullable: true })
  cnp: string;

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

  @OneToMany(() => HandicapRequestComment, (comment) => comment.request)
  comments: HandicapRequestComment[];
}
