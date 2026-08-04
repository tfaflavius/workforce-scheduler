import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { Exclude } from 'class-transformer';

export enum UserRole {
  MASTER_ADMIN = 'MASTER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  // Rol lateral, read-only: vede DOAR sectiunea Programe, pentru evidenta pontajului,
  // limitat la departamentele configurate de Master Admin (vezi hrVisibleDepartmentIds).
  RESURSE_UMANE = 'RESURSE_UMANE',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Index()
  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Index()
  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_login', nullable: true })
  lastLogin: Date;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  /**
   * Doar pentru rolul RESURSE_UMANE: lista de department_id din care userul HR
   * are voie sa vada programele (evidenta pontaj). Gol = niciun departament.
   */
  @Column({ name: 'hr_visible_department_ids', type: 'jsonb', default: () => "'[]'" })
  hrVisibleDepartmentIds: string[];

  /**
   * Doar pentru RESURSE_UMANE: daca true, arata doar turele de pe pozitia DISP
   * (Dispecerat) ale userilor vizibili — adica doar zilele lucrate efectiv in Dispecerat.
   */
  @Column({ name: 'hr_only_disp_position', type: 'boolean', default: false })
  hrOnlyDispPosition: boolean;

  /** Brute-force protection: failed login attempts counter */
  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  /** Account locked until this timestamp (null = not locked) */
  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;
}
