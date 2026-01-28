import { IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Old password must be at least 6 characters' })
  oldPassword?: string;

  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least one uppercase letter and one number',
  })
  newPassword: string;

  @IsString()
  @MinLength(6, { message: 'Confirm password must be at least 6 characters' })
  confirmPassword: string;
}
