import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../../modules/users/entities/user.entity';

class SendTestEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  @Roles(UserRole.ADMIN)
  async sendTestEmail(@Body() dto: SendTestEmailDto) {
    const success = await this.emailService.sendTestEmail(dto.email, dto.name);
    return {
      success,
      message: success
        ? `Email de test trimis cu succes către ${dto.email}`
        : 'Eroare la trimiterea emailului. Verifică configurația Resend.',
    };
  }
}
