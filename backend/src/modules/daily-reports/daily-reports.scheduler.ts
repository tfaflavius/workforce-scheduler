import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DailyReportsService } from './daily-reports.service';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class DailyReportsScheduler {
  private readonly logger = new Logger(DailyReportsScheduler.name);

  constructor(
    private readonly dailyReportsService: DailyReportsService,
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly emailService: EmailService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ============== CRON ZILNIC: Verificare rapoarte lipsa (notificari in-app + push) ==============

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

    const missingNames = missingUsers.map((u) => u.fullName).join(', ');
    this.logger.log(`Utilizatori fara raport zilnic (${missingUsers.length}): ${missingNames}`);

    // Construieste lista scurta de nume pt mesaj
    const shortList =
      missingUsers.length <= 3
        ? missingUsers.map((u) => u.fullName).join(', ')
        : `${missingUsers
            .slice(0, 3)
            .map((u) => u.fullName)
            .join(', ')} si alti ${missingUsers.length - 3}`;

    const message = `${missingUsers.length} utilizator(i) nu au trimis raportul zilnic: ${shortList}.`;

    // Notifica adminii
    const admins = await this.userRepository.find({
      where: { role: In([UserRole.ADMIN, UserRole.MASTER_ADMIN]), isActive: true },
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
          missingUserIds: missingUsers.map((u) => u.id),
        },
        skipPush: true, // Push sent separately below with custom message
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
          missingUserIds: missingUsers.map((u) => u.id),
        },
        skipPush: true, // Push sent separately below with custom message
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
        NotificationType.DAILY_REPORT_MISSING,
      );
    }

    // Notifica si userii insisi ca nu au trimis raportul
    const userNotifications = missingUsers.map((u) => ({
      userId: u.id,
      type: NotificationType.DAILY_REPORT_MISSING,
      title: 'Raport zilnic netrimis',
      message: 'Nu ai trimis raportul zilnic pentru astazi. Te rugam sa il completezi.',
      data: {
        date: today,
        isSelfNotification: true,
      },
      skipPush: true, // Push trimis separat cu mesaj personalizat
    }));

    if (userNotifications.length > 0) {
      await this.notificationsService.createMany(userNotifications);

      await this.pushNotificationService.sendToUsers(
        missingUsers.map((u) => u.id),
        'Raport zilnic netrimis',
        'Nu ai trimis raportul zilnic pentru astazi. Te rugam sa il completezi.',
        { type: 'DAILY_REPORT_MISSING', date: today, isSelfNotification: true },
        NotificationType.DAILY_REPORT_MISSING,
      );
    }

    // Email catre fiecare user fara raport, cu numarul total de rapoarte netrimise luna aceasta
    // (+1 pentru ziua de azi, care tocmai a fost constatata ca netrimisa).
    let emailsSent = 0;
    for (const u of missingUsers) {
      if (!u.email) continue;
      try {
        const stats = await this.dailyReportsService.getMyMonthlyReportStats(u.id);
        const missingThisMonth = stats.missingCount + 1;
        const ok = await this.emailService.sendMissingReportReminder(
          u.email,
          u.fullName,
          missingThisMonth,
        );
        if (ok) emailsSent++;
      } catch (err) {
        this.logger.error(`Eroare email raport lipsa pentru ${u.fullName}: ${err.message}`);
      }
    }

    this.logger.log(
      `Notificari lipsa raport trimise: ${notifications.length} la admini/manageri, ${userNotifications.length} la userii fara raport, ${emailsSent} emailuri`,
    );
  }

  // Rezumatul saptamanal email pentru manageri a fost mutat in AdminConsolidatedScheduler
  // care trimite raport consolidat saptamanal catre admini + manageri (Vineri 20:30)
}
