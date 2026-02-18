import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserFiltersDto } from './dto/user-filters.dto';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { EmailService } from '../../common/email/email.service';
import { removeDiacritics } from '../../common/utils/remove-diacritics';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      fullName: createUserDto.fullName ? removeDiacritics(createUserDto.fullName) : createUserDto.fullName,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Send welcome email
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://workforce-scheduler.vercel.app';
    await this.emailService.sendWelcomeEmail({
      employeeEmail: savedUser.email,
      employeeName: savedUser.fullName,
      temporaryPassword: createUserDto.password, // Parola originala (inainte de hash)
      loginUrl: `${frontendUrl}/login`,
    });

    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['department'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['department'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // If email is being updated, check for conflicts
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Hash password if it's being updated
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Daca se actualizeaza departmentId, trebuie sa stergem relatia department
    // pentru ca TypeORM sa foloseasca noul departmentId
    if (updateUserDto.departmentId !== undefined) {
      delete (user as any).department;
    }

    if (updateUserDto.fullName) {
      updateUserDto.fullName = removeDiacritics(updateUserDto.fullName);
    }
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);

    // Sterge din Supabase Auth (permite re-inregistrarea cu acelasi email)
    try {
      await this.supabaseService.deleteUser(id);
    } catch (error) {
      // Log but don't block - user might not exist in Supabase (e.g. created by admin directly)
      console.warn(`Could not delete user ${id} from Supabase Auth:`, error?.message);
    }

    // Clean up all related records to avoid FK constraint violations
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 1. Delete child records (NO ACTION / RESTRICT constraints)
      await queryRunner.query('DELETE FROM location_logs WHERE user_id = $1', [id]);
      await queryRunner.query('DELETE FROM time_entries WHERE user_id = $1', [id]);
      await queryRunner.query('DELETE FROM schedule_assignments WHERE user_id = $1', [id]);

      // 2. Comment tables (RESTRICT)
      await queryRunner.query('DELETE FROM parking_issue_comments WHERE user_id = $1', [id]);
      await queryRunner.query('DELETE FROM parking_damage_comments WHERE user_id = $1', [id]);
      await queryRunner.query('DELETE FROM domiciliu_request_comments WHERE user_id = $1', [id]);
      await queryRunner.query('DELETE FROM handicap_legitimation_comments WHERE user_id = $1', [id]);
      await queryRunner.query('DELETE FROM handicap_request_comments WHERE user_id = $1', [id]);
      await queryRunner.query('DELETE FROM revolutionar_legitimation_comments WHERE user_id = $1', [id]);
      await queryRunner.query('DELETE FROM parking_history WHERE user_id = $1', [id]);

      // 3. Parking/Handicap/Domiciliu tables (RESTRICT on created_by)
      await queryRunner.query('DELETE FROM parking_issues WHERE created_by = $1', [id]);
      await queryRunner.query('DELETE FROM parking_damages WHERE created_by = $1', [id]);
      await queryRunner.query('DELETE FROM domiciliu_requests WHERE created_by = $1', [id]);
      await queryRunner.query('DELETE FROM handicap_requests WHERE created_by = $1', [id]);
      await queryRunner.query('DELETE FROM handicap_legitimations WHERE created_by = $1', [id]);
      await queryRunner.query('DELETE FROM revolutionar_legitimations WHERE created_by = $1', [id]);
      await queryRunner.query('DELETE FROM cash_collections WHERE collected_by = $1', [id]);

      // 4. Shift swap tables (NO ACTION)
      await queryRunner.query('DELETE FROM shift_swap_responses WHERE responder_id = $1', [id]);
      await queryRunner.query('DELETE FROM shift_swap_requests WHERE requester_id = $1', [id]);

      // 5. Tasks (NO ACTION)
      await queryRunner.query('DELETE FROM task_history WHERE changed_by = $1', [id]);
      await queryRunner.query('DELETE FROM tasks WHERE assigned_to = $1 OR assigned_by = $1', [id]);

      // 6. Edit requests (RESTRICT)
      await queryRunner.query('DELETE FROM edit_requests WHERE requested_by = $1', [id]);

      // 7. Generated reports (NO ACTION)
      await queryRunner.query('DELETE FROM generated_reports WHERE generated_by = $1', [id]);

      // 8. NULL-ify references where user is optional (SET NULL or NO ACTION on admin fields)
      await queryRunner.query('UPDATE daily_reports SET admin_commented_by = NULL WHERE admin_commented_by = $1', [id]);
      await queryRunner.query('UPDATE leave_requests SET admin_id = NULL WHERE admin_id = $1', [id]);
      await queryRunner.query('UPDATE departments SET manager_id = NULL WHERE manager_id = $1', [id]);
      await queryRunner.query('UPDATE time_entries SET approved_by = NULL WHERE approved_by = $1', [id]);
      await queryRunner.query('UPDATE work_schedules SET created_by = NULL WHERE created_by = $1', [id]);
      await queryRunner.query('UPDATE work_schedules SET approved_by_admin = NULL WHERE approved_by_admin = $1', [id]);
      await queryRunner.query('UPDATE shift_swap_requests SET admin_id = NULL WHERE admin_id = $1', [id]);
      await queryRunner.query('UPDATE shift_swap_requests SET approved_responder_id = NULL WHERE approved_responder_id = $1', [id]);

      // 9. Now delete the user (CASCADE handles: leave_requests, leave_balances, daily_reports, notifications, push_subscriptions)
      await queryRunner.query('DELETE FROM users WHERE id = $1', [id]);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    requestingUserId: string,
    isAdmin: boolean,
  ): Promise<void> {
    // Validate confirmPassword matches
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.findOne(userId);

    // If not admin, verify old password using Supabase
    if (!isAdmin && dto.oldPassword) {
      try {
        await this.supabaseService.signIn(user.email, dto.oldPassword);
      } catch {
        throw new UnauthorizedException('Old password is incorrect');
      }
    }

    // Update password in Supabase Auth
    await this.supabaseService.updateUserPassword(userId, dto.newPassword);

    // Also update hash in local DB for backwards compatibility
    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);
  }

  async toggleActiveStatus(userId: string, isActive: boolean): Promise<User> {
    const user = await this.findOne(userId);
    user.isActive = isActive;
    return this.userRepository.save(user);
  }

  async findAllWithFilters(filters: UserFiltersDto): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .orderBy('user.createdAt', 'DESC');

    if (filters.search) {
      query.andWhere(
        '(user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.role) {
      query.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters.departmentId) {
      query.andWhere('user.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      });
    }

    if (filters.isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    return query.getMany();
  }

  async getUserStats() {
    const [total, active] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
    ]);

    const byRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    const byDepartment = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.department', 'dept')
      .select('dept.name', 'departmentName')
      .addSelect('COUNT(*)', 'count')
      .where('dept.id IS NOT NULL')
      .groupBy('dept.id, dept.name')
      .getRawMany();

    return {
      totalUsers: total,
      activeUsers: active,
      inactiveUsers: total - active,
      byRole,
      byDepartment,
    };
  }
}
