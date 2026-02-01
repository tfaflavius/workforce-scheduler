import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ShiftSwapRequest } from './shift-swap-request.entity';

export enum SwapResponseType {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Entity('shift_swap_responses')
export class ShiftSwapResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Cererea de schimb la care răspunde
  @Column({ type: 'uuid', name: 'swap_request_id' })
  swapRequestId: string;

  @ManyToOne(() => ShiftSwapRequest, (request) => request.responses)
  @JoinColumn({ name: 'swap_request_id' })
  swapRequest: ShiftSwapRequest;

  // Userul care răspunde
  @Column({ type: 'uuid', name: 'responder_id' })
  responderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'responder_id' })
  responder: User;

  // Tipul răspunsului
  @Column({
    type: 'varchar',
  })
  response: SwapResponseType;

  // Mesaj opțional
  @Column({ type: 'text', nullable: true })
  message: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
