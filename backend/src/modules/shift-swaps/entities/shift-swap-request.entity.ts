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
  PENDING = 'PENDING',           // Asteptare raspunsuri de la useri
  AWAITING_ADMIN = 'AWAITING_ADMIN', // Cel putin un user a acceptat, asteapta admin
  APPROVED = 'APPROVED',         // Admin a aprobat schimbul
  REJECTED = 'REJECTED',         // Admin a respins sau toti userii au refuzat
  CANCELLED = 'CANCELLED',       // Solicitantul a anulat
  EXPIRED = 'EXPIRED',           // A expirat fara raspuns
}

@Entity('shift_swap_requests')
export class ShiftSwapRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Userul care solicita schimbul
  @Column({ type: 'uuid', name: 'requester_id' })
  requesterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  // Data pe care o are solicitantul si vrea sa o schimbe
  @Column({ type: 'date', name: 'requester_date' })
  requesterDate: Date;

  // Tipul de tura pe care o are solicitantul (pentru referinta)
  @Column({ type: 'varchar', name: 'requester_shift_type', nullable: true })
  requesterShiftType: string;

  // Data pe care o doreste solicitantul
  @Column({ type: 'date', name: 'target_date' })
  targetDate: Date;

  // Tipul de tura de la data tinta (pentru referinta)
  @Column({ type: 'varchar', name: 'target_shift_type', nullable: true })
  targetShiftType: string;

  // Motivul solicitarii
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

  // Raspunsurile de la useri
  @OneToMany(() => ShiftSwapResponse, (response) => response.swapRequest)
  responses: ShiftSwapResponse[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
