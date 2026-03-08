import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserFiltersDto } from './dto/user-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('me')
  getCurrentUser(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  getUserStats() {
    return this.usersService.getUserStats();
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Query() filters: UserFiltersDto) {
    if (Object.keys(filters).length > 0) {
      return this.usersService.findAllWithFilters(filters);
    }
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    const isMasterAdmin = req.user.role === UserRole.MASTER_ADMIN;
    const isAdminOrAbove = req.user.role === UserRole.ADMIN || isMasterAdmin;
    const isOwnProfile = req.user.id === id;

    // Utilizatorii pot actualiza doar propriul profil
    // Adminii pot actualiza orice profil
    if (!isAdminOrAbove && !isOwnProfile) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Doar MASTER_ADMIN poate schimba rolurile
    if (updateUserDto.role !== undefined && !isMasterAdmin) {
      throw new ForbiddenException('Only Master Admin can change user roles');
    }

    // Daca nu e admin, restrictioneaza campurile ce pot fi modificate
    if (!isAdminOrAbove) {
      // Utilizatorii normali pot modifica doar: fullName, phone, birthDate
      const allowedFields = ['fullName', 'phone', 'birthDate'];
      const restrictedUpdate: UpdateUserDto = {};

      for (const field of allowedFields) {
        if (updateUserDto[field] !== undefined) {
          restrictedUpdate[field] = updateUserDto[field];
        }
      }

      return this.usersService.update(id, restrictedUpdate);
    }

    return this.usersService.update(id, updateUserDto, req.user);
  }

  @Patch(':id/password')
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @Request() req,
  ) {
    const isAdminOrAbove = req.user.role === UserRole.ADMIN || req.user.role === UserRole.MASTER_ADMIN;
    const canChange = isAdminOrAbove || req.user.id === id;

    if (!canChange) {
      throw new ForbiddenException('You can only change your own password');
    }

    await this.usersService.changePassword(id, dto, req.user.id, isAdminOrAbove);
    return { message: 'Password changed successfully' };
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.MASTER_ADMIN)
  async toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.usersService.toggleActiveStatus(id, isActive);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER_ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
