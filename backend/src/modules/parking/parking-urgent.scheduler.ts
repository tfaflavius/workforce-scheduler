import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ParkingIssuesService } from './parking-issues.service';
import { ParkingDamagesService } from './parking-damages.service';
import { CashCollectionsService } from './cash-collections.service';
import { HandicapRequestsService } from './handicap-requests.service';
import { HandicapLegitimationsService } from './handicap-legitimations.service';
import { RevolutionarLegitimationsService } from './revolutionar-legitimations.service';
import { EmailService } from '../../common/email/email.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { HandicapRequest } from './entities/handicap-request.entity';
import { HandicapLegitimation } from './entities/handicap-legitimation.entity';
import { RevolutionarLegitimation } from './entities/revolutionar-legitimation.entity';
import { MAINTENANCE_DEPARTMENT_NAME, HANDICAP_PARKING_DEPARTMENT_NAME, HANDICAP_REQUEST_TYPE_LABELS } from './constants/parking.constants';

@Injectable()
export class ParkingUrgentScheduler {
  private readonly logger = new Logger(ParkingUrgentScheduler.name);

  constructor(
    private readonly parkingIssuesService: ParkingIssuesService,
    private readonly parkingDamagesService: ParkingDamagesService,
    private readonly cashCollectionsService: CashCollectionsService,
    private readonly handicapRequestsService: HandicapRequestsService,
    private readonly handicapLegitimationsService: HandicapLegitimationsService,
    private readonly revolutionarLegitimationsService: RevolutionarLegitimationsService,
    private readonly emailService: EmailService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(HandicapRequest)
    private readonly handicapRequestRepository: Repository<HandicapRequest>,
    @InjectRepository(HandicapLegitimation)
    private readonly handicapLegitimationRepository: Repository<HandicapLegitimation>,
    @InjectRepository(RevolutionarLegitimation)
    private readonly revolutionarLegitimationRepository: Repository<RevolutionarLegitimation>,
  ) {}

  // Ruleaza doar in zilele lucratoare (Luni-Vineri) la 08:00 si 13:00 pentru a marca problemele urgente (dupa 48h nerezolvate)
  @Cron('0 8,13 * * 1-5')
  async handleMarkUrgent() {
    this.logger.log('Verificare probleme si prejudicii nerezolvate de 48h+...');

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

  // Ruleaza doar in zilele lucratoare (Luni-Vineri) la 08:00 - notificari catre Admini, Manageri, Dispecerat + Intretinere (doar asignat)
  @Cron('0 8 * * 1-5')
  async handleNotifyUrgentMorning() {
    this.logger.log('Trimitere notificari 08:00 (inclusiv Admini)...');

    try {
      // Notificari in-app
      await this.parkingIssuesService.notifyUrgentIssues();

      // Trimite emailuri cu reminder-uri - include Admini
      await this.sendUnresolvedItemsReminderEmails(true);

      this.logger.log('Notificari 08:00 trimise cu succes');
    } catch (error) {
      this.logger.error('Eroare la trimiterea notificarilor 08:00:', error);
    }
  }

  // Ruleaza doar in zilele lucratoare (Luni-Vineri) la 13:00 - notificari catre Manageri, Dispecerat + Intretinere (doar asignat) - FARA Admini
  @Cron('0 13 * * 1-5')
  async handleNotifyUrgentAfternoon() {
    this.logger.log('Trimitere notificari 13:00 (fara Admini)...');

    try {
      // Notificari in-app
      await this.parkingIssuesService.notifyUrgentIssues();

      // Trimite emailuri cu reminder-uri - FARA Admini
      await this.sendUnresolvedItemsReminderEmails(false);

      this.logger.log('Notificari 13:00 trimise cu succes');
    } catch (error) {
      this.logger.error('Eroare la trimiterea notificarilor 13:00:', error);
    }
  }

  // Ruleaza doar in zilele lucratoare (Luni-Vineri) la 18:00 pentru raportul de incasari
  @Cron('0 18 * * 1-5')
  async handleDailyCashReport() {
    this.logger.log('Generare raport zilnic incasari...');

    try {
      await this.sendDailyCashReportEmails();
      this.logger.log('Raport zilnic incasari trimis cu succes');
    } catch (error) {
      this.logger.error('Eroare la trimiterea raportului zilnic:', error);
    }
  }

  // Ruleaza doar in zilele lucratoare (Luni-Vineri) la 09:00 pentru raportul Handicap catre Admin si Parcari Handicap
  @Cron('0 9 * * 1-5')
  async handleDailyHandicapReport() {
    this.logger.log('Generare raport zilnic Handicap pentru Admin si Parcari Handicap (zile lucratoare)...');

    try {
      await this.sendDailyHandicapReportToAdminAndHandicapDept();
      this.logger.log('Raport zilnic Handicap trimis cu succes');
    } catch (error) {
      this.logger.error('Eroare la trimiterea raportului Handicap:', error);
    }
  }

  /**
   * Trimite emailuri cu reminder-uri pentru probleme si prejudicii nerezolvate
   * - Dispecerat: primeste TOATE problemele si prejudiciile
   * - Intretinere Parcari: primeste DOAR problemele asignate lor
   * - Manageri: primesc TOATE
   * - Admini: primesc TOATE (doar la 08:00)
   * @param includeAdmins - daca sa includa adminii (true la 08:00, false la 13:00)
   */
  private async sendUnresolvedItemsReminderEmails(includeAdmins: boolean): Promise<void> {
    // Obtine toate problemele si prejudiciile active
    const activeIssues = await this.parkingIssuesService.findAll('ACTIVE');
    const activeDamages = await this.parkingDamagesService.findAllActive();

    if (activeIssues.length === 0 && activeDamages.length === 0) {
      this.logger.log('Nu exista probleme sau prejudicii nerezolvate');
      return;
    }

    const now = new Date();

    // Formateaza problemele pentru email (cu assignedTo pentru filtrare)
    const allUnresolvedIssues = activeIssues.map(issue => {
      const createdAt = new Date(issue.createdAt);
      const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: issue.id,
        parkingLotName: issue.parkingLot?.name || 'N/A',
        equipment: issue.equipment,
        createdAt: createdAt.toLocaleDateString('ro-RO'),
        daysOpen,
        isUrgent: issue.isUrgent,
        assignedTo: issue.assignedTo, // pentru filtrare
      };
    });

    // Formateaza prejudiciile pentru email
    const allUnresolvedDamages = activeDamages.map(damage => {
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

    // Obtine departamentele
    const dispeceratDept = await this.departmentRepository.findOne({
      where: { name: 'Dispecerat' },
    });

    const maintenanceDept = await this.departmentRepository.findOne({
      where: { name: MAINTENANCE_DEPARTMENT_NAME },
    });

    // Obtine userii pe categorii
    const managers = await this.userRepository.find({
      where: { role: UserRole.MANAGER, isActive: true },
    });

    const admins = includeAdmins
      ? await this.userRepository.find({
          where: { role: UserRole.ADMIN, isActive: true },
        })
      : [];

    const dispeceratUsers = dispeceratDept
      ? await this.userRepository.find({
          where: { departmentId: dispeceratDept.id, isActive: true },
        })
      : [];

    const maintenanceUsers = maintenanceDept
      ? await this.userRepository.find({
          where: { departmentId: maintenanceDept.id, isActive: true },
        })
      : [];

    let sentCount = 0;
    const processedUserIds = new Set<string>();

    // Helper pentru a trimite email si a evita duplicate
    const sendEmailToUser = async (
      user: User,
      issues: typeof allUnresolvedIssues,
      damages: typeof allUnresolvedDamages,
    ) => {
      if (processedUserIds.has(user.id)) return;
      if (issues.length === 0 && damages.length === 0) return;

      processedUserIds.add(user.id);

      // Exclude assignedTo din obiectele trimise
      const cleanIssues = issues.map(({ assignedTo, ...rest }) => rest);

      const success = await this.emailService.sendUnresolvedItemsReminder({
        recipientEmail: user.email,
        recipientName: user.fullName,
        unresolvedIssues: cleanIssues,
        unresolvedDamages: damages,
      });
      if (success) sentCount++;
    };

    // 1. Admini - primesc TOATE (doar daca includeAdmins=true)
    for (const admin of admins) {
      await sendEmailToUser(admin, allUnresolvedIssues, allUnresolvedDamages);
    }

    // 2. Manageri - primesc TOATE
    for (const manager of managers) {
      await sendEmailToUser(manager, allUnresolvedIssues, allUnresolvedDamages);
    }

    // 3. Dispecerat - primesc TOATE
    for (const user of dispeceratUsers) {
      await sendEmailToUser(user, allUnresolvedIssues, allUnresolvedDamages);
    }

    // 4. Intretinere Parcari - primesc DOAR problemele asignate lor (prejudiciile nu au assignedTo)
    for (const user of maintenanceUsers) {
      // Filtreaza doar problemele asignate acestui user
      const userAssignedIssues = allUnresolvedIssues.filter(
        issue => issue.assignedTo === user.id,
      );

      // Intretinere nu primeste prejudicii (nu au assignedTo)
      await sendEmailToUser(user, userAssignedIssues, []);
    }

    const totalRecipients = processedUserIds.size;
    this.logger.log(
      `Reminder-uri trimise catre ${sentCount}/${totalRecipients} utilizatori ` +
        `(Admini: ${admins.length}, Manageri: ${managers.length}, ` +
        `Dispecerat: ${dispeceratUsers.length}, Intretinere: ${maintenanceUsers.length})`,
    );
  }

  /**
   * Trimite raportul zilnic de incasari catre admini si manageri
   */
  private async sendDailyCashReportEmails(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Obtine totalurile pentru ziua curenta
    const totals = await this.cashCollectionsService.getTotals({
      startDate: today,
      endDate: tomorrow,
    });

    // Nu trimite raport daca nu sunt incasari
    if (totals.count === 0) {
      this.logger.log('Nu exista incasari pentru ziua curenta, nu se trimite raport');
      return;
    }

    // Obtine admini si manageri
    const recipients = await this.userRepository.find({
      where: [
        { role: UserRole.ADMIN, isActive: true },
        { role: UserRole.MANAGER, isActive: true },
      ],
    });

    if (recipients.length === 0) {
      this.logger.warn('Nu exista destinatari pentru raportul zilnic');
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

    this.logger.log(`Raport zilnic trimis catre ${sentCount}/${recipients.length} destinatari. Total incasari: ${totals.totalAmount.toFixed(2)} RON`);
  }

  /**
   * Trimite raportul zilnic Handicap catre Admin si departamentul Parcari Handicap
   * Include: create azi, finalizate azi, active, expirate (>5 zile), legitimatii handicap si revolutionar
   */
  private async sendDailyHandicapReportToAdminAndHandicapDept(): Promise<void> {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    // Obtine solicitarile Handicap si legitimatii
    const [
      createdToday,
      resolvedToday,
      allActive,
      allHandicapLegitimations,
      allRevolutionarLegitimations,
    ] = await Promise.all([
      // Create azi
      this.handicapRequestRepository.find({
        where: {
          createdAt: MoreThan(today),
        },
        relations: ['creator'],
        order: { createdAt: 'DESC' },
      }),
      // Finalizate azi
      this.handicapRequestRepository.find({
        where: {
          status: 'FINALIZAT',
          resolvedAt: MoreThan(today),
        },
        relations: ['creator', 'resolver'],
        order: { resolvedAt: 'DESC' },
      }),
      // Toate active
      this.handicapRequestRepository.find({
        where: {
          status: 'ACTIVE',
        },
        relations: ['creator'],
        order: { createdAt: 'ASC' },
      }),
      // Legitimatii Handicap (active)
      this.handicapLegitimationRepository.find({
        where: {
          status: 'ACTIVE',
        },
        relations: ['creator'],
        order: { createdAt: 'DESC' },
      }),
      // Legitimatii Revolutionar (active)
      this.revolutionarLegitimationRepository.find({
        where: {
          status: 'ACTIVE',
        },
        relations: ['creator'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    // Separa active in normale si expirate
    const activeNormal: typeof allActive = [];
    const expired: typeof allActive = [];

    for (const req of allActive) {
      const createdAt = new Date(req.createdAt);
      if (createdAt < fiveDaysAgo) {
        expired.push(req);
      } else {
        activeNormal.push(req);
      }
    }

    // Obtine adminii
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    // Obtine userii din departamentul Parcari Handicap
    const handicapDept = await this.departmentRepository.findOne({
      where: { name: HANDICAP_PARKING_DEPARTMENT_NAME },
    });

    const handicapDeptUsers = handicapDept
      ? await this.userRepository.find({
          where: { departmentId: handicapDept.id, isActive: true },
        })
      : [];

    // Combina destinatarii (fara duplicate)
    const allRecipients = [...admins];
    for (const user of handicapDeptUsers) {
      if (!allRecipients.find(r => r.id === user.id)) {
        allRecipients.push(user);
      }
    }

    if (allRecipients.length === 0) {
      this.logger.warn('Nu exista destinatari pentru raportul Handicap');
      return;
    }

    const reportDate = today.toLocaleDateString('ro-RO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Formateaza datele pentru email
    const formatRequest = (req: HandicapRequest) => {
      const createdAt = new Date(req.createdAt);
      const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        type: HANDICAP_REQUEST_TYPE_LABELS[req.requestType] || req.requestType,
        location: req.location,
        personName: req.personName || '-',
        carPlate: req.carPlate || '-',
        createdAt: createdAt.toLocaleDateString('ro-RO'),
        createdBy: req.creator?.fullName || 'N/A',
        daysOpen,
      };
    };

    const formatHandicapLegitimation = (leg: HandicapLegitimation) => {
      const createdAt = new Date(leg.createdAt);
      return {
        personName: leg.personName,
        carPlate: leg.carPlate,
        certificateNumber: leg.handicapCertificateNumber,
        createdAt: createdAt.toLocaleDateString('ro-RO'),
        createdBy: leg.creator?.fullName || 'N/A',
      };
    };

    const formatRevolutionarLegitimation = (leg: RevolutionarLegitimation) => {
      const createdAt = new Date(leg.createdAt);
      return {
        personName: leg.personName,
        carPlate: leg.carPlate,
        lawNumber: leg.lawNumber,
        createdAt: createdAt.toLocaleDateString('ro-RO'),
        createdBy: leg.creator?.fullName || 'N/A',
      };
    };

    // Trimite emailuri catre toti destinatarii
    let sentCount = 0;
    for (const recipient of allRecipients) {
      const success = await this.emailService.sendHandicapDailyReport({
        recipientEmail: recipient.email,
        recipientName: recipient.fullName,
        reportDate,
        createdToday: createdToday.map(formatRequest),
        resolvedToday: resolvedToday.map(r => ({
          ...formatRequest(r),
          resolvedBy: r.resolver?.fullName || 'N/A',
          resolutionDescription: r.resolutionDescription || '-',
        })),
        activeRequests: activeNormal.map(formatRequest),
        expiredRequests: expired.map(formatRequest),
        legitimations: allHandicapLegitimations.map(formatHandicapLegitimation),
        revolutionarLegitimations: allRevolutionarLegitimations.map(formatRevolutionarLegitimation),
        summary: {
          createdTodayCount: createdToday.length,
          resolvedTodayCount: resolvedToday.length,
          activeCount: activeNormal.length,
          expiredCount: expired.length,
          legitimationsCount: allHandicapLegitimations.length,
          revolutionarLegitimationsCount: allRevolutionarLegitimations.length,
        },
      });
      if (success) sentCount++;
    }

    this.logger.log(
      `Raport Handicap trimis catre ${sentCount}/${allRecipients.length} destinatari ` +
      `(${admins.length} admini, ${handicapDeptUsers.length} Parcari Handicap). ` +
      `Create azi: ${createdToday.length}, Finalizate azi: ${resolvedToday.length}, ` +
      `Active: ${activeNormal.length}, Expirate: ${expired.length}, ` +
      `Legitimatii Handicap: ${allHandicapLegitimations.length}, Legitimatii Revolutionar: ${allRevolutionarLegitimations.length}`
    );
  }

}
