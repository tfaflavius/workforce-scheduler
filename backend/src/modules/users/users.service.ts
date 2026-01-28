import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserFiltersDto } from './dto/user-filters.dto';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly supabaseService: SupabaseService,
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
      password: hashedPassword,
    });

    return this.userRepository.save(user);
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

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
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
