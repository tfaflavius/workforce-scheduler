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
import { EquipmentStockDefinition } from './equipment-stock-definition.entity';
import { User } from '../../users/entities/user.entity';

@Entity('equipment_stock_entries')
export class EquipmentStockEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'definition_id' })
  definitionId: string;

  @Index()
  @Column({ length: 50 })
  category: string; // StockCategory

  @Column({ type: 'int' })
  quantity: number;

  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'date_added', type: 'date' })
  dateAdded: string;

  @Column({ name: 'added_by_id' })
  addedById: string;

  @Column({ name: 'last_edited_by_id', nullable: true })
  lastEditedById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => EquipmentStockDefinition, (def) => def.entries, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'definition_id' })
  definition: EquipmentStockDefinition;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'added_by_id' })
  addedBy: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_edited_by_id' })
  lastEditedBy: User;
}
