import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { EquipmentStockEntry } from './equipment-stock-entry.entity';

@Entity('equipment_stock_definitions')
export class EquipmentStockDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Index()
  @Column({ length: 50 })
  category: string; // StockCategory | 'ALL'

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => EquipmentStockEntry, (entry) => entry.definition)
  entries: EquipmentStockEntry[];
}
