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
import { ShiftSwapResponse } from './shift-swap-response.entity';

export enum ShiftSwapStatus {
  PENDING = 'PENDING',           // Așteptare răspunsuri de la useri
  AWAITING_ADMIN = 'AWAITING_ADMIN', // Cel puțin un user a acceptat, așteaptă admin
  APPROVED = 'APPROVED',         // Admin a aprobat schimbul
  REJECTED = 'REJECTED',         // Admin a respins sau toți userii au refuzat
  CANCELLED = 'CANCELLED',       // Solicitantul a anulat
  EXPIRED = 'EXPIRED',           // A expirat fără răspuns
}

@Entity('shift_swap_requests')
export class ShiftSwapRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Userul care solicită schimbul
  @Column({ type: 'uuid', name: 'requester_id' })
  requesterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  // Data pe care o are solicitantul și vrea să o schimbe
  @Column({ type: 'date', name: 'requester_date' })
  requesterDate: Date;

  // Tipul de tură pe care o are solicitantul (pentru referință)
  @Column({ type: 'varchar', name: 'requester_shift_type', nullable: true })
  requesterShiftType: string;

  // Data pe care o dorește solicitantul
  @Column({ type: 'date', name: 'target_date' })
  targetDate: Date;

  // Tipul de tură de la data țintă (pentru referință)
  @Column({ type: 'varchar', name: 'target_shift_type', nullable: true })
  targetShiftType: string;

  // Motivul solicitării
  @Column({ type: 'text' })
  reason: string;

  // Status-ul cererii
  @Column({
    type: 'varchar',
    default: ShiftSwapStatus.PENDING,
  })
  status: ShiftSwapStatus;

  // Userul care a fost aprobat pentru schimb (setat de admin)
  @Column({ type: 'uuid', name: 'approved_responder_id', nullable: true })
  approvedResponderId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approved_responder_id' })
  approvedResponder: User;

  // Admin-ul care a aprobat/respins
  @Column({ type: 'uuid', name: 'admin_id', nullable: true })
  adminId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_id' })
  admin: User;

  // Note de la admin
  @Column({ type: 'text', name: 'admin_notes', nullable: true })
  adminNotes: string | null;

  // Răspunsurile de la useri
  @OneToMany(() => ShiftSwapResponse, (response) => response.swapRequest)
  responses: ShiftSwapResponse[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
