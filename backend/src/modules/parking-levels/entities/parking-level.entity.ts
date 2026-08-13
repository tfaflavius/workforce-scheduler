import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Locuri de parcare pe nivele, pentru parcarile etajate.
 * Un rand = un nivel dintr-o parcare, cu numarul de locuri pe categorii.
 */
@Entity('parking_levels')
@Index('IDX_parking_levels_order', ['parkingOrder', 'levelOrder'])
export class ParkingLevel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parking_name', length: 150 })
  parkingName: string;

  // Ordinea parcarii (pentru grupare/sortare in interfata)
  @Column({ name: 'parking_order', type: 'int', default: 0 })
  parkingOrder: number;

  // Ordinea nivelului in cadrul parcarii
  @Column({ name: 'level_order', type: 'int', default: 0 })
  levelOrder: number;

  // "Nivelul" (ex: -1, 0, 1) — text, poate contine si valori ne-numerice
  @Column({ name: 'level_number', length: 50, nullable: true })
  levelNumber: string | null;

  // "Denumire nivel" (ex: "P1 - Rosu")
  @Column({ name: 'level_name', length: 150, nullable: true })
  levelName: string | null;

  @Column({ type: 'int', default: 0 })
  total: number;

  @Column({ type: 'int', default: 0 })
  normal: number;

  @Column({ type: 'int', default: 0 })
  handicap: number;

  @Column({ name: 'mama_copil', type: 'int', default: 0 })
  mamaCopil: number;

  @Column({ type: 'int', default: 0 })
  electric: number;

  @Column({ type: 'int', default: 0 })
  rezervat: number;

  @Column({ type: 'int', default: 0 })
  moto: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
