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
import { DomiciliuRequestComment } from './domiciliu-request-comment.entity';
import { DomiciliuRequestType, DomiciliuRequestStatus } from '../constants/parking.constants';

@Entity('domiciliu_requests')
export class DomiciliuRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_type', length: 30 })
  requestType: DomiciliuRequestType;

  @Column({ length: 20, default: 'ACTIVE' })
  status: DomiciliuRequestStatus;

  // Câmpuri comune pentru toate tipurile
  @Column({ type: 'text' })
  location: string;

  @Column({ name: 'google_maps_link', type: 'text', nullable: true })
  googleMapsLink: string;

  @Column({ type: 'text' })
  description: string;

  // Date persoană
  @Column({ name: 'person_name', length: 255 })
  personName: string;

  @Column({ name: 'cnp', length: 20, nullable: true })
  cnp: string;

  @Column({ name: 'address', type: 'text' })
  address: string;

  @Column({ name: 'car_plate', length: 20 })
  carPlate: string;

  @Column({ name: 'car_brand', length: 100, nullable: true })
  carBrand: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  // Număr contract/autorizație
  @Column({ name: 'contract_number', length: 100, nullable: true })
  contractNumber: string;

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

  @OneToMany(() => DomiciliuRequestComment, (comment) => comment.request)
  comments: DomiciliuRequestComment[];
}
