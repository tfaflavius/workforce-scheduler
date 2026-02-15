import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyReportsService } from './daily-reports.service';
import { EmailService, WeeklyDailyReportSummaryData } from '../../common/email/email.service';
import { User, UserRole } from '../users/entities/user.entity';
import { DailyReport } from './entities/daily-report.entity';

@Injectable()
export class DailyReportsScheduler {
  private readonly logger = new Logger(DailyReportsScheduler.name);

  private readonly dayNames = ['Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'];

  constructor(
    private readonly dailyReportsService: DailyReportsService,
    private readonly emailService: EmailService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Vineri la 17:00 — rezumat saptamanal rapoarte zilnice
  @Cron('0 17 * * 5')
  async handleWeeklyDailyReportSummary() {
    this.logger.log('Generare rezumat saptamanal rapoarte zilnice...');
    try {
      await this.sendWeeklyReportEmails();
      this.logger.log('Rezumat saptamanal trimis cu succes');
    } catch (error) {
      this.logger.error(`Eroare la trimiterea rezumatului saptamanal: ${error.message}`);
    }
  }

  private async sendWeeklyReportEmails(): Promise<void> {
    // Calculeaza intervalul saptamanii: Luni → Vineri
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Duminica, 5=Vineri
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const friday = new Date(now);
    friday.setHours(23, 59, 59, 999);

    const mondayStr = monday.toISOString().split('T')[0];
    const fridayStr = friday.toISOString().split('T')[0];

    // 1. Trimite la toti adminii cu TOATE rapoartele
    const allReports = await this.dailyReportsService.getWeeklyReportsForAdmin(monday, friday);

    if (allReports.length === 0) {
      this.logger.log('Nu exista rapoarte zilnice in aceasta saptamana.');
      return;
    }

    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    const adminEmailData = this.buildEmailData(allReports, mondayStr, fridayStr);

    for (const admin of admins) {
      try {
        await this.emailService.sendWeeklyDailyReportSummary({
          ...adminEmailData,
          recipientEmail: admin.email,
          recipientName: admin.fullName,
        });
        this.logger.log(`Email rezumat saptamanal trimis la admin: ${admin.email}`);
      } catch (error) {
        this.logger.error(`Eroare email admin ${admin.email}: ${error.message}`);
      }
    }

    // 2. Trimite la manageri cu rapoarte filtrate
    const managers = await this.userRepository.find({
      where: { role: UserRole.MANAGER, isActive: true },
    });

    for (const manager of managers) {
      try {
        const managerReports = await this.dailyReportsService.getWeeklyReportsForManager(monday, friday);

        if (managerReports.length === 0) continue;

        const managerEmailData = this.buildEmailData(managerReports, mondayStr, fridayStr);

        await this.emailService.sendWeeklyDailyReportSummary({
          ...managerEmailData,
          recipientEmail: manager.email,
          recipientName: manager.fullName,
        });
        this.logger.log(`Email rezumat saptamanal trimis la manager: ${manager.email}`);
      } catch (error) {
        this.logger.error(`Eroare email manager ${manager.email}: ${error.message}`);
      }
    }
  }

  private buildEmailData(
    reports: DailyReport[],
    weekStartDate: string,
    weekEndDate: string,
  ): Omit<WeeklyDailyReportSummaryData, 'recipientEmail' | 'recipientName'> {
    // Genereaza zilele saptamanii (Luni → Vineri)
    const startDate = new Date(weekStartDate);
    const days: Array<{ dayName: string; date: string }> = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dayName: this.dayNames[d.getDay()],
        date: dateStr,
      });
    }

    // Grupeaza rapoartele pe zi
    const reportsByDay = days.map(day => ({
      dayName: day.dayName,
      date: day.date,
      reports: reports
        .filter(r => {
          const reportDate = typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0];
          return reportDate === day.date;
        })
        .map(r => ({
          userName: r.user?.fullName || 'Necunoscut',
          departmentName: r.user?.department?.name || 'Necunoscut',
          content: r.content,
          adminComment: r.adminComment || undefined,
          adminCommentedBy: r.adminCommentedBy?.fullName || undefined,
        })),
    }));

    // Calculeaza totaluri
    const uniqueUsers = new Set(reports.map(r => r.userId));

    return {
      weekStartDate,
      weekEndDate,
      reportsByDay,
      totalReports: reports.length,
      totalUsers: uniqueUsers.size,
    };
  }
}
