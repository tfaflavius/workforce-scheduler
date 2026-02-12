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
import { RevolutionarLegitimationComment } from './revolutionar-legitimation-comment.entity';

export type RevolutionarLegitimationStatus = 'ACTIVE' | 'FINALIZAT';

@Entity('revolutionar_legitimations')
export class RevolutionarLegitimation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, default: 'ACTIVE' })
  status: RevolutionarLegitimationStatus;

  // Date persoană
  @Column({ name: 'person_name', length: 255 })
  personName: string;

  @Column({ length: 20, nullable: true })
  cnp: string;

  // Lege / Hotărâre în loc de certificat handicap
  @Column({ name: 'law_number', length: 100 })
  lawNumber: string;

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

  @OneToMany(() => RevolutionarLegitimationComment, (comment) => comment.legitimation)
  comments: RevolutionarLegitimationComment[];
}
