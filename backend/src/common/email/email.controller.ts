import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';
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

class TestDamageEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  type?: 'new_damage' | 'damage_resolved';
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

  @Post('test-damage')
  @Roles(UserRole.ADMIN)
  async sendTestDamageEmail(@Body() dto: TestDamageEmailDto) {
    const damageType = dto.type || 'new_damage';
    const success = await this.emailService.sendParkingDamageNotification({
      recipientEmail: dto.email,
      recipientName: dto.name,
      parkingLotName: 'Parcare Test',
      damagedEquipment: 'Barieră Test',
      personName: 'Ion Popescu',
      carPlate: 'B-123-TST',
      description: 'Aceasta este o descriere de test pentru email prejudiciu.',
      isUrgent: false,
      creatorName: 'Admin Test',
      damageType: damageType,
      resolutionType: damageType === 'damage_resolved' ? 'RECUPERAT' : undefined,
      resolutionDescription: damageType === 'damage_resolved' ? 'Test rezolvare' : undefined,
    });
    return {
      success,
      message: success
        ? `Email prejudiciu (${damageType}) trimis cu succes către ${dto.email}`
        : 'Eroare la trimiterea emailului.',
    };
  }
}
