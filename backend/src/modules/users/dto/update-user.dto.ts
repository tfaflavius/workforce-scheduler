import { IsBoolean, IsDateString, IsEmail, IsEnum, IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'User password (8-128 chars, must contain uppercase + digit)', example: 'NewSecurePass456', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8, { message: 'Parola trebuie sa aiba cel putin 8 caractere' })
  @MaxLength(128, { message: 'Parola nu poate depasi 128 caractere' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Parola trebuie sa contina cel putin o litera mare si o cifra',
  })
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Full name of the user', example: 'John Doe' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+40712345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'User role', enum: UserRole, example: 'USER' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Department ID to assign the user to', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Whether the user account is active', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'User birth date in ISO 8601 format', example: '1990-05-15' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;
}
