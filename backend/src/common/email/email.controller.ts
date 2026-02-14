import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, User } from '../../modules/users/entities/user.entity';

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
  constructor(
    private readonly emailService: EmailService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Post('test')
  @Roles(UserRole.ADMIN)
  async sendTestEmail(@Body() dto: SendTestEmailDto) {
    const success = await this.emailService.sendTestEmail(dto.email, dto.name);
    return {
      success,
      message: success
        ? `Email de test trimis cu succes catre ${dto.email}`
        : 'Eroare la trimiterea emailului. Verifica configuratia Resend.',
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
      damagedEquipment: 'Bariera Test',
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
        ? `Email prejudiciu (${damageType}) trimis cu succes catre ${dto.email}`
        : 'Eroare la trimiterea emailului.',
    };
  }

  @Post('test-shift-swap')
  @Roles(UserRole.ADMIN)
  async sendTestShiftSwapEmail(@Body() dto: SendTestEmailDto) {
    const success = await this.emailService.sendShiftSwapNotification({
      recipientEmail: dto.email,
      recipientName: dto.name,
      requesterName: 'Ion Popescu',
      requesterDate: '15 Februarie 2026',
      targetDate: '18 Februarie 2026',
      reason: 'Am o urgenta personala si am nevoie sa schimb tura.',
      swapType: 'new_request',
    });
    return {
      success,
      message: success
        ? `Email schimb tura trimis cu succes catre ${dto.email}`
        : 'Eroare la trimiterea emailului.',
    };
  }

  @Post('test-leave-request')
  @Roles(UserRole.ADMIN)
  async sendTestLeaveRequestEmail(@Body() dto: SendTestEmailDto) {
    const success = await this.emailService.sendLeaveRequestNotification({
      employeeEmail: dto.email,
      employeeName: dto.name,
      leaveType: 'ANNUAL',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      totalDays: 5,
      status: 'submitted',
    });
    return {
      success,
      message: success
        ? `Email cerere concediu trimis cu succes catre ${dto.email}`
        : 'Eroare la trimiterea emailului.',
    };
  }

  @Post('test-all')
  @Roles(UserRole.ADMIN)
  async sendAllTestEmails(@Body() dto: SendTestEmailDto) {
    const results = {
      test: false,
      shiftSwap: false,
      leaveRequest: false,
      parkingIssue: false,
      parkingDamage: false,
    };

    // Test general
    results.test = await this.emailService.sendTestEmail(dto.email, dto.name);

    // Shift swap
    results.shiftSwap = await this.emailService.sendShiftSwapNotification({
      recipientEmail: dto.email,
      recipientName: dto.name,
      requesterName: 'Ion Popescu',
      requesterDate: '15 Februarie 2026',
      targetDate: '18 Februarie 2026',
      reason: 'Test schimb tura',
      swapType: 'new_request',
    });

    // Leave request
    results.leaveRequest = await this.emailService.sendLeaveRequestNotification({
      employeeEmail: dto.email,
      employeeName: dto.name,
      leaveType: 'ANNUAL',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      totalDays: 5,
      status: 'submitted',
    });

    // Parking issue
    results.parkingIssue = await this.emailService.sendParkingIssueNotification({
      recipientEmail: dto.email,
      recipientName: dto.name,
      parkingLotName: 'Parcare Test',
      equipment: 'Bariera intrare',
      description: 'Test problema parcare',
      isUrgent: false,
      creatorName: 'Admin Test',
      issueType: 'new_issue',
    });

    // Parking damage
    results.parkingDamage = await this.emailService.sendParkingDamageNotification({
      recipientEmail: dto.email,
      recipientName: dto.name,
      parkingLotName: 'Parcare Test',
      damagedEquipment: 'Bariera Test',
      personName: 'Ion Popescu',
      carPlate: 'B-123-TST',
      description: 'Test prejudiciu',
      isUrgent: false,
      creatorName: 'Admin Test',
      damageType: 'new_damage',
    });

    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    return {
      success: successCount === totalCount,
      message: `Emailuri trimise cu succes: ${successCount}/${totalCount}`,
      results,
    };
  }

  @Post('welcome-broadcast')
  @Roles(UserRole.ADMIN)
  async sendWelcomeBroadcast() {
    // Get all active users
    const users = await this.userRepository.find({
      where: { isActive: true },
    });

    const results = {
      total: users.length,
      sent: 0,
      failed: 0,
      details: [] as { email: string; name: string; success: boolean }[],
    };

    for (const user of users) {
      const success = await this.emailService.sendWelcomeBroadcast(
        user.email,
        user.fullName,
        user.role,
      );

      if (success) {
        results.sent++;
      } else {
        results.failed++;
      }

      results.details.push({
        email: user.email,
        name: user.fullName,
        success,
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      success: results.failed === 0,
      message: `Emailuri trimise: ${results.sent}/${results.total}. Esuate: ${results.failed}`,
      results,
    };
  }
}
