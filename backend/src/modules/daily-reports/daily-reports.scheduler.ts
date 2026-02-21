import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyReportsService } from './daily-reports.service';
import { EmailService, WeeklyDailyReportSummaryData } from '../../common/email/email.service';
import { User, UserRole } from '../users/entities/user.entity';
import { DailyReport } from './entities/daily-report.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class DailyReportsScheduler {
  private readonly logger = new Logger(DailyReportsScheduler.name);

  private readonly dayNames = ['Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'];

  constructor(
    private readonly dailyReportsService: DailyReportsService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ============== CRON ZILNIC: Verificare rapoarte lipsa ==============

  @Cron('0 21 * * *', { timeZone: 'Europe/Bucharest' })
  async handleDailyMissingReportCheck() {
    this.logger.log('Verificare rapoarte zilnice lipsa...');
    try {
      await this.checkAndNotifyMissingReports();
      this.logger.log('Verificare rapoarte lipsa finalizata');
    } catch (error) {
      this.logger.error(`Eroare la verificarea rapoartelor lipsa: ${error.message}`);
    }
  }

  private async checkAndNotifyMissingReports(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const missingUsers = await this.dailyReportsService.getMissingReports(today);

    if (missingUsers.length === 0) {
      this.logger.log('Toti utilizatorii au trimis rapoartele zilnice.');
      return;
    }

    const missingNames = missingUsers.map(u => u.fullName).join(', ');
    this.logger.log(`Utilizatori fara raport zilnic (${missingUsers.length}): ${missingNames}`);

    // Construieste lista scurta de nume pt mesaj
    const shortList = missingUsers.length <= 3
      ? missingUsers.map(u => u.fullName).join(', ')
      : `${missingUsers.slice(0, 3).map(u => u.fullName).join(', ')} si alti ${missingUsers.length - 3}`;

    const message = `${missingUsers.length} utilizator(i) nu au trimis raportul zilnic: ${shortList}.`;

    // Notifica adminii
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    const managers = await this.userRepository.find({
      where: { role: UserRole.MANAGER, isActive: true },
    });

    const notifications: any[] = [];
    const pushUserIds: string[] = [];

    for (const admin of admins) {
      notifications.push({
        userId: admin.id,
        type: NotificationType.DAILY_REPORT_MISSING,
        title: 'Rapoarte zilnice lipsa',
        message,
        data: {
          date: today,
          missingCount: missingUsers.length,
          missingUserIds: missingUsers.map(u => u.id),
        },
      });
      pushUserIds.push(admin.id);
    }

    // Notifica managerii (evita duplicate)
    for (const manager of managers) {
      if (pushUserIds.includes(manager.id)) continue;
      notifications.push({
        userId: manager.id,
        type: NotificationType.DAILY_REPORT_MISSING,
        title: 'Rapoarte zilnice lipsa',
        message,
        data: {
          date: today,
          missingCount: missingUsers.length,
          missingUserIds: missingUsers.map(u => u.id),
        },
      });
      pushUserIds.push(manager.id);
    }

    if (notifications.length > 0) {
      await this.notificationsService.createMany(notifications);
    }

    if (pushUserIds.length > 0) {
      await this.pushNotificationService.sendToUsers(
        pushUserIds,
        'Rapoarte zilnice lipsa',
        `${missingUsers.length} utilizator(i) nu au trimis raportul zilnic.`,
        { type: 'DAILY_REPORT_MISSING', date: today },
      );
    }

    this.logger.log(`Notificari lipsa raport trimise la ${notifications.length} utilizatori`);
  }

  // ============== CRON SAPTAMANAL: Email rezumat vineri ==============

  @Cron('0 17 * * 5', { timeZone: 'Europe/Bucharest' })
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

    // Calculeaza rapoartele lipsa pentru fiecare zi din saptamana
    const missingByDate = new Map<string, Array<{ userName: string; departmentName: string }>>();
    const current = new Date(monday);
    while (current <= friday) {
      const dateStr = current.toISOString().split('T')[0];
      const dayIdx = current.getDay();
      if (dayIdx >= 1 && dayIdx <= 5) {
        try {
          const missingUsers = await this.dailyReportsService.getMissingReports(dateStr);
          if (missingUsers.length > 0) {
            missingByDate.set(
              dateStr,
              missingUsers.map(u => ({
                userName: u.fullName,
                departmentName: u.department?.name || 'Necunoscut',
              })),
            );
          }
        } catch (error) {
          this.logger.error(`Eroare la calcularea rapoartelor lipsa pentru ${dateStr}: ${error.message}`);
        }
      }
      current.setDate(current.getDate() + 1);
    }

    // Adminii primesc raport saptamanal consolidat separat (AdminConsolidatedScheduler)
    // Trimite doar la manageri
    const managers = await this.userRepository.find({
      where: { role: UserRole.MANAGER, isActive: true },
    });

    for (const manager of managers) {
      try {
        const managerReports = await this.dailyReportsService.getWeeklyReportsForManager(monday, friday);

        if (managerReports.length === 0 && missingByDate.size === 0) continue;

        const managerEmailData = this.buildEmailData(managerReports, mondayStr, fridayStr, missingByDate);

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
    missingByDate?: Map<string, Array<{ userName: string; departmentName: string }>>,
  ): Omit<WeeklyDailyReportSummaryData, 'recipientEmail' | 'recipientName'> {
    // Genereaza zilele saptamanii (Luni → Vineri)
    const startDate = new Date(weekStartDate + 'T12:00:00');
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

    // Grupeaza rapoartele pe zi + adauga utilizatori lipsa
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
      missingUsers: missingByDate?.get(day.date) || [],
    }));

    // Calculeaza totaluri
    const uniqueUsers = new Set(reports.map(r => r.userId));
    const totalMissing = missingByDate
      ? Array.from(missingByDate.values()).reduce((sum, users) => sum + users.length, 0)
      : 0;

    return {
      weekStartDate,
      weekEndDate,
      reportsByDay,
      totalReports: reports.length,
      totalUsers: uniqueUsers.size,
      totalMissing,
    };
  }
}
