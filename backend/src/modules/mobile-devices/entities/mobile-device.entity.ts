import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Dispozitiv mobil dat in folosinta unui user (telefon, tableta, modem etc.).
 * Subsectiune a sectiunii Parcari: "Dispozitive Mobile pe User".
 */
@Entity('mobile_devices')
export class MobileDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Ce dispozitiv este (ex: Telefon, Tableta, Modem/Router)
  @Column({ name: 'device_type', length: 100 })
  deviceType: string;

  // Ce model este (ex: Samsung Galaxy A14)
  @Column({ length: 150 })
  model: string;

  // Serie / IMEI
  @Column({ name: 'serial_imei', length: 150, nullable: true })
  serialImei: string | null;

  // Operator SIM (ex: Orange, Vodafone, Digi) — daca este cazul
  @Column({ name: 'sim_operator', length: 100, nullable: true })
  simOperator: string | null;

  // Serie SIM — daca este cazul
  @Column({ name: 'sim_serial', length: 150, nullable: true })
  simSerial: string | null;

  // Stare dispozitiv (Functional, Defect, In reparatie, Casat)
  @Column({ length: 50, default: 'Functional' })
  status: string;

  // Data predarii dispozitivului catre user
  @Column({ name: 'handover_date', type: 'date', nullable: true })
  handoverDate: string | null;

  // La ce user este dat (poate fi nealocat)
  @Index()
  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser: User | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ name: 'last_edited_by_id', type: 'uuid', nullable: true })
  lastEditedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_edited_by_id' })
  lastEditedBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
