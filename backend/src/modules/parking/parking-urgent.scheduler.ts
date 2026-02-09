import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ParkingIssuesService } from './parking-issues.service';
import { ParkingDamagesService } from './parking-damages.service';
import { CashCollectionsService } from './cash-collections.service';
import { EmailService } from '../../common/email/email.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { MAINTENANCE_DEPARTMENT_NAME } from './constants/parking.constants';

@Injectable()
export class ParkingUrgentScheduler {
  private readonly logger = new Logger(ParkingUrgentScheduler.name);

  constructor(
    private readonly parkingIssuesService: ParkingIssuesService,
    private readonly parkingDamagesService: ParkingDamagesService,
    private readonly cashCollectionsService: CashCollectionsService,
    private readonly emailService: EmailService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  // Rulează zilnic la 08:00 și 13:00 pentru a marca problemele urgente (după 48h nerezolvate)
  @Cron('0 8,13 * * *')
  async handleMarkUrgent() {
    this.logger.log('Verificare probleme și prejudicii nerezolvate de 48h+...');

    try {
      const issuesMarked = await this.parkingIssuesService.markUrgentIssues();
      const damagesMarked = await this.parkingDamagesService.markUrgentDamages();

      if (issuesMarked > 0 || damagesMarked > 0) {
        this.logger.log(`Marcate ca urgente: ${issuesMarked} probleme, ${damagesMarked} prejudicii`);
      }
    } catch (error) {
      this.logger.error('Eroare la marcarea problemelor urgente:', error);
    }
  }

  // Rulează de 2 ori pe zi (la 08:00 și 13:00) pentru notificări urgente in-app și email
  @Cron('0 8,13 * * *')
  async handleNotifyUrgent() {
    this.logger.log('Trimitere notificări și emailuri pentru probleme urgente...');

    try {
      // Notificări in-app
      await this.parkingIssuesService.notifyUrgentIssues();

      // Trimite emailuri cu reminder-uri pentru probleme și prejudicii nerezolvate
      await this.sendUnresolvedItemsReminderEmails();

      this.logger.log('Notificări și emailuri urgente trimise cu succes');
    } catch (error) {
      this.logger.error('Eroare la trimiterea notificărilor urgente:', error);
    }
  }

  // Rulează zilnic la 18:00 pentru raportul de încasări
  @Cron('0 18 * * *')
  async handleDailyCashReport() {
    this.logger.log('Generare raport zilnic încasări...');

    try {
      await this.sendDailyCashReportEmails();
      this.logger.log('Raport zilnic încasări trimis cu succes');
    } catch (error) {
      this.logger.error('Eroare la trimiterea raportului zilnic:', error);
    }
  }

  /**
   * Trimite emailuri cu reminder-uri pentru probleme și prejudicii nerezolvate
   * către userii din Dispecerat și Întreținere Parcări
   */
  private async sendUnresolvedItemsReminderEmails(): Promise<void> {
    // Obține toate problemele și prejudiciile active
    const activeIssues = await this.parkingIssuesService.findAll('ACTIVE');
    const activeDamages = await this.parkingDamagesService.findAllActive();

    if (activeIssues.length === 0 && activeDamages.length === 0) {
      this.logger.log('Nu există probleme sau prejudicii nerezolvate');
      return;
    }

    // Obține userii care trebuie notificați
    const usersToNotify = await this.getUsersForReminders();

    if (usersToNotify.length === 0) {
      this.logger.warn('Nu există utilizatori pentru trimiterea reminder-urilor');
      return;
    }

    const now = new Date();

    // Formatează problemele pentru email
    const unresolvedIssues = activeIssues.map(issue => {
      const createdAt = new Date(issue.createdAt);
      const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        parkingLotName: issue.parkingLot?.name || 'N/A',
        equipment: issue.equipment,
        createdAt: createdAt.toLocaleDateString('ro-RO'),
        daysOpen,
        isUrgent: issue.isUrgent,
      };
    });

    // Formatează prejudiciile pentru email
    const unresolvedDamages = activeDamages.map(damage => {
      const createdAt = new Date(damage.createdAt);
      const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        parkingLotName: damage.parkingLot?.name || 'N/A',
        damagedEquipment: damage.damagedEquipment,
        personName: damage.personName,
        carPlate: damage.carPlate,
        createdAt: createdAt.toLocaleDateString('ro-RO'),
        daysOpen,
        isUrgent: damage.isUrgent,
      };
    });

    // Trimite emailuri
    let sentCount = 0;
    for (const user of usersToNotify) {
      const success = await this.emailService.sendUnresolvedItemsReminder({
        recipientEmail: user.email,
        recipientName: user.fullName,
        unresolvedIssues,
        unresolvedDamages,
      });
      if (success) sentCount++;
    }

    this.logger.log(`Reminder-uri trimise către ${sentCount}/${usersToNotify.length} utilizatori`);
  }

  /**
   * Trimite raportul zilnic de încasări către admini și manageri
   */
  private async sendDailyCashReportEmails(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Obține totalurile pentru ziua curentă
    const totals = await this.cashCollectionsService.getTotals({
      startDate: today,
      endDate: tomorrow,
    });

    // Nu trimite raport dacă nu sunt încasări
    if (totals.count === 0) {
      this.logger.log('Nu există încasări pentru ziua curentă, nu se trimite raport');
      return;
    }

    // Obține admini și manageri
    const recipients = await this.userRepository.find({
      where: [
        { role: UserRole.ADMIN, isActive: true },
        { role: UserRole.MANAGER, isActive: true },
      ],
    });

    if (recipients.length === 0) {
      this.logger.warn('Nu există destinatari pentru raportul zilnic');
      return;
    }

    const reportDate = today.toLocaleDateString('ro-RO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Trimite emailuri
    let sentCount = 0;
    for (const recipient of recipients) {
      const success = await this.emailService.sendDailyCashReport({
        recipientEmail: recipient.email,
        recipientName: recipient.fullName,
        reportDate,
        totalAmount: totals.totalAmount,
        collectionCount: totals.count,
        byParkingLot: totals.byParkingLot.map(lot => ({
          parkingLotName: lot.parkingLotName,
          totalAmount: lot.totalAmount,
          count: lot.count,
        })),
        byMachine: totals.byMachine.map(machine => ({
          machineNumber: machine.machineNumber,
          parkingLotName: machine.parkingLotName,
          totalAmount: machine.totalAmount,
          count: machine.count,
        })),
      });
      if (success) sentCount++;
    }

    this.logger.log(`Raport zilnic trimis către ${sentCount}/${recipients.length} destinatari. Total încasări: ${totals.totalAmount.toFixed(2)} RON`);
  }

  /**
   * Obține utilizatorii care trebuie să primească reminder-uri
   * (Dispecerat, Întreținere Parcări, Manageri, Admini)
   */
  private async getUsersForReminders(): Promise<User[]> {
    const dispeceratDept = await this.departmentRepository.findOne({
      where: { name: 'Dispecerat' },
    });

    const maintenanceDept = await this.departmentRepository.findOne({
      where: { name: MAINTENANCE_DEPARTMENT_NAME },
    });

    const users = await this.userRepository.find({
      where: [
        { role: UserRole.ADMIN, isActive: true },
        { role: UserRole.MANAGER, isActive: true },
        ...(dispeceratDept ? [{ departmentId: dispeceratDept.id, isActive: true }] : []),
        ...(maintenanceDept ? [{ departmentId: maintenanceDept.id, isActive: true }] : []),
      ],
    });

    // Elimină duplicatele
    const uniqueUsers = users.filter(
      (user, index, self) => index === self.findIndex(u => u.id === user.id)
    );

    return uniqueUsers;
  }
}
