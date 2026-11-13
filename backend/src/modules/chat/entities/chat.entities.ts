import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * DIRECT       = conversatie privata intre 2 oameni (directKey = "idMic:idMare")
 * DEPARTMENT   = grupul automat al unui departament
 * ANNOUNCEMENTS = canalul de anunturi pentru toata lumea (scriu doar manager/admin)
 */
export type ChatConversationType = 'DIRECT' | 'DEPARTMENT' | 'ANNOUNCEMENTS';

@Entity('chat_conversations')
@Index('UQ_chat_direct_key', ['directKey'], { unique: true, where: '"direct_key" IS NOT NULL' })
@Index('UQ_chat_department', ['departmentId'], {
  unique: true,
  where: '"department_id" IS NOT NULL',
})
@Index('UQ_chat_announcements', ['type'], { unique: true, where: `"type" = 'ANNOUNCEMENTS'` })
export class ChatConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  type: ChatConversationType;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @Column({ name: 'direct_key', type: 'varchar', length: 80, nullable: true })
  directKey: string | null;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('chat_messages')
@Index('IDX_chat_messages_conv_created', ['conversationId', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => ChatConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ChatConversation;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

/** Pana unde a citit fiecare om fiecare conversatie (pentru mesajele necitite). */
@Entity('chat_reads')
export class ChatRead {
  @PrimaryColumn({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'last_read_at', type: 'timestamptz' })
  lastReadAt: Date;
}
