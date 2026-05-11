import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DomiciliuRequestComment } from './domiciliu-request-comment.entity';
import { DomiciliuRequestType, DomiciliuRequestStatus, ParkingLayoutType, DomiciliuRequestPriority, SignPlacementStatus } from '../constants/parking.constants';

@Entity('domiciliu_requests')
@Index('IDX_domiciliu_requests_status', ['status'])
@Index('IDX_domiciliu_requests_created_at', ['createdAt'])
export class DomiciliuRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_type', length: 30 })
  requestType: DomiciliuRequestType;

  @Column({ length: 20, default: 'ACTIVE' })
  status: DomiciliuRequestStatus;

  // Prioritate pentru deadline tracking si UX
  @Column({ length: 10, default: 'MEDIU' })
  priority: DomiciliuRequestPriority;

  // Data limita pana la care trebuie finalizata procedura
  @Column({ name: 'deadline', type: 'timestamptz', nullable: true })
  deadline: Date;

  // Marcheaza daca s-a trimis deja notificarea de "deadline approaching" (24h)
  // pentru a evita notificari duplicate de la cron-ul care ruleaza periodic
  @Column({ name: 'deadline_notified_at', type: 'timestamptz', nullable: true })
  deadlineNotifiedAt: Date;

  // Campuri comune pentru toate tipurile
  @Column({ type: 'text' })
  location: string;

  @Column({ name: 'google_maps_link', type: 'text', nullable: true })
  googleMapsLink: string;

  @Column({ type: 'text' })
  description: string;

  // Campuri specifice parcari domiciliu
  @Column({ name: 'number_of_spots', type: 'int', nullable: true })
  numberOfSpots: number;

  @Column({ name: 'parking_layout', length: 20, nullable: true })
  parkingLayout: ParkingLayoutType;

  // Date persoana (optionale - nu sunt necesare pentru trasare/revocare)
  @Column({ name: 'person_name', length: 255, nullable: true })
  personName: string;

  @Column({ name: 'cnp', length: 20, nullable: true })
  cnp: string;

  @Column({ name: 'address', type: 'text', nullable: true })
  address: string;

  @Column({ name: 'car_plate', length: 20, nullable: true })
  carPlate: string;

  @Column({ name: 'car_brand', length: 100, nullable: true })
  carBrand: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  // Numar contract/autorizatie
  @Column({ name: 'contract_number', length: 100, nullable: true })
  contractNumber: string;

  // Amplasare panou
  @Column({ name: 'sign_placement_status', length: 20, default: 'NONE' })
  signPlacementStatus: SignPlacementStatus;

  @Column({ name: 'sign_placement_requested_at', type: 'timestamptz', nullable: true })
  signPlacementRequestedAt: Date;

  @Column({ name: 'sign_placement_requested_by', nullable: true })
  signPlacementRequestedBy: string;

  @Column({ name: 'sign_placement_claimed_by', nullable: true })
  signPlacementClaimedBy: string;

  @Column({ name: 'sign_placement_claimed_at', type: 'timestamptz', nullable: true })
  signPlacementClaimedAt: Date;

  @Column({ name: 'sign_placement_completed_by', nullable: true })
  signPlacementCompletedBy: string;

  @Column({ name: 'sign_placement_completed_at', type: 'timestamptz', nullable: true })
  signPlacementCompletedAt: Date;

  @Column({ name: 'sign_placement_observations', type: 'text', nullable: true })
  signPlacementObservations: string;

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

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sign_placement_requested_by' })
  signPlacementRequester: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sign_placement_claimed_by' })
  signPlacementClaimer: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sign_placement_completed_by' })
  signPlacementCompleter: User;

  @OneToMany(() => DomiciliuRequestComment, (comment) => comment.request)
  comments: DomiciliuRequestComment[];
}
