import { IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiPropertyOptional({ description: 'Current password (required for non-admin users)', example: 'OldPass123' })
  @IsOptional()
  @IsString()
  oldPassword?: string;

  @ApiProperty({ description: 'New password (8-128 characters, must contain uppercase + digit)', example: 'NewSecure456' })
  @IsString()
  @MinLength(8, { message: 'Parola trebuie sa aiba cel putin 8 caractere' })
  @MaxLength(128, { message: 'Parola nu poate depasi 128 caractere' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Parola trebuie sa contina cel putin o litera mare si o cifra',
  })
  newPassword: string;

  @ApiProperty({ description: 'Confirm new password (must match newPassword)', example: 'NewSecure456' })
  @IsString()
  @MinLength(8, { message: 'Confirmarea parolei trebuie sa aiba cel putin 8 caractere' })
  @MaxLength(128, { message: 'Confirmarea parolei nu poate depasi 128 caractere' })
  confirmPassword: string;
}
