import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Adresa de email invalida' })
  @IsNotEmpty({ message: 'Emailul este obligatoriu' })
  email: string;
}
