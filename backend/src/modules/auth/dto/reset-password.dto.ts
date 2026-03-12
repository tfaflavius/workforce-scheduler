import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiPropertyOptional({ description: 'Password reset token received via email', example: 'abc123resettoken' })
  @IsString()
  @IsOptional()
  token?: string;

  @ApiPropertyOptional({ description: 'Access token for authenticated password reset', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiProperty({ description: 'New password (8-128 characters)', example: 'newSecurePass456', minLength: 8, maxLength: 128 })
  @IsString()
  @IsNotEmpty({ message: 'Parola noua este obligatorie' })
  @MinLength(8, { message: 'Parola trebuie sa aiba cel putin 8 caractere' })
  @MaxLength(128, { message: 'Parola nu poate depasi 128 caractere' })
  newPassword: string;
}
