import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password (minimum 8 characters)', example: 'securePass123', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+40712345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'User role', enum: UserRole, default: UserRole.USER, example: 'USER' })
  @Transform(({ value }) => value?.toUpperCase?.() || value)
  @IsEnum(UserRole, { message: 'role must be one of: ADMIN, MANAGER, USER' })
  @IsOptional()
  role?: UserRole = UserRole.USER;

  @ApiPropertyOptional({ description: 'Department ID to assign the user to', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsOptional()
  departmentId?: string;
}
