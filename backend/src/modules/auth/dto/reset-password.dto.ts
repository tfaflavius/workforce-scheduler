import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsOptional()
  token?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsNotEmpty({ message: 'Parola noua este obligatorie' })
  @MinLength(6, { message: 'Parola trebuie sa aiba cel putin 6 caractere' })
  @MaxLength(128, { message: 'Parola nu poate depasi 128 caractere' })
  newPassword: string;
}
