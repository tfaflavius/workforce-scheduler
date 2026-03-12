import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password (8-128 chars, must contain uppercase + digit)', example: 'SecurePass123', minLength: 8, maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Parola trebuie sa aiba cel putin 8 caractere' })
  @MaxLength(128, { message: 'Parola nu poate depasi 128 caractere' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Parola trebuie sa contina cel putin o litera mare si o cifra',
  })
  password: string;

  @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+40712345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'User role', enum: UserRole, example: 'USER' })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({ description: 'Department ID to assign the user to', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsOptional()
  departmentId?: string;
}
