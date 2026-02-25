import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { ParkingIssue } from '../parking/entities/parking-issue.entity';
import { ParkingDamage } from '../parking/entities/parking-damage.entity';
import { HandicapRequest } from '../parking/entities/handicap-request.entity';
import { HandicapLegitimation } from '../parking/entities/handicap-legitimation.entity';
import { RevolutionarLegitimation } from '../parking/entities/revolutionar-legitimation.entity';
import { EmailService } from '../../common/email/email.service';
import { CashCollectionsService } from '../parking/cash-collections.service';
import { ParkingIssuesService } from '../parking/parking-issues.service';
import { ParkingDamagesService } from '../parking/parking-damages.service';
import { TimeTrackingService } from '../time-tracking/time-tracking.service';
import { DailyReportsService } from '../daily-reports/daily-reports.service';
import { DailyReport } from '../daily-reports/entities/daily-report.entity';
import { PvDisplaySession } from '../parking/entities/pv-display-session.entity';
import { PvDisplayDay } from '../parking/entities/pv-display-day.entity';
import { HANDICAP_REQUEST_TYPE_LABELS, PV_DAY_STATUS, PV_SESSION_STATUS, PV_DAY_STATUS_LABELS, CONTROL_SESIZARE_TYPE_LABELS } from '../parking/constants/parking.constants';
import { ControlSesizare } from '../parking/entities/control-sesizare.entity';

/**
 * Admin & Manager Consolidated Scheduler
 *
 * Sends consolidated email reports:
 * 1. Manager morning report (Mon-Fri 08:00) — consolidated to managers only
 * 2. Daily consolidated report (Mon-Fri 20:00) — consolidated to admins + managers
 * 3. Weekly consolidated report (Friday 20:30) — weekly summary to admins + managers
 */
@Injectable()
export class AdminConsolidatedScheduler {
  private readonly logger = new Logger(AdminConsolidatedScheduler.name);

  private readonly dayNames = ['Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'];

  constructor(
    private readonly emailService: EmailService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ParkingIssue)
    private readonly parkingIssueRepository: Repository<ParkingIssue>,
    @InjectRepository(ParkingDamage)
    private readonly parkingDamageRepository: Repository<ParkingDamage>,
    @InjectRepository(HandicapRequest)
    private readonly handicapRequestRepository: Repository<HandicapRequest>,
    @InjectRepository(HandicapLegitimation)
    private readonly handicapLegitimationRepository: Repository<HandicapLegitimation>,
    @InjectRepository(RevolutionarLegitimation)
    private readonly revolutionarLegitimationRepository: Repository<RevolutionarLegitimation>,
    @InjectRepository(PvDisplaySession)
    private readonly pvDisplaySessionRepository: Repository<PvDisplaySession>,
    @InjectRepository(PvDisplayDay)
    private readonly pvDisplayDayRepository: Repository<PvDisplayDay>,
    @InjectRepository(ControlSesizare)
    private readonly controlSesizareRepository: Repository<ControlSesizare>,
    private readonly cashCollectionsService: CashCollectionsService,
    private readonly parkingIssuesService: ParkingIssuesService,
    private readonly parkingDamagesService: ParkingDamagesService,
    private readonly timeTrackingService: TimeTrackingService,
    private readonly dailyReportsService: DailyReportsService,
  ) {}

  // ============== CRON 1: Raport zilnic consolidat DIMINEATA — doar Manageri (08:00) ==============

  @Cron('0 8 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async handleManagerMorningReport() {
    this.logger.log('[Consolidat] Generare raport dimineata pentru manageri...');

    try {
      const managers = await this.userRepository.find({
        where: { role: UserRole.MANAGER, isActive: true },
      });

      if (managers.length === 0) {
        this.logger.warn('[Consolidat] Nu exista manageri activi');
        return;
      }

      const sentCount = await this.sendConsolidatedDaily(managers);
      this.logger.log(`[Consolidat] Raport dimineata trimis la ${sentCount}/${managers.length} manageri`);
    } catch (error) {
      this.logger.error(`[Consolidat] Eroare raport dimineata manageri: ${error.message}`);
    }
  }

  // ============== CRON 2: Raport zilnic consolidat SEARA — Admini + Manageri (20:00) ==============

  @Cron('0 20 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async handleConsolidatedDailyReport() {
    this.logger.log('[Consolidat] Generare raport seara pentru admini + manageri...');

    try {
      const [admins, managers] = await Promise.all([
        this.userRepository.find({ where: { role: UserRole.ADMIN, isActive: true } }),
        this.userRepository.find({ where: { role: UserRole.MANAGER, isActive: true } }),
      ]);

      const recipients = [...admins, ...managers];
      if (recipients.length === 0) {
        this.logger.warn('[Consolidat] Nu exista admini sau manageri activi');
        return;
      }

      const sentCount = await this.sendConsolidatedDaily(recipients);
      this.logger.log(`[Consolidat] Raport seara trimis la ${sentCount}/${recipients.length} (${admins.length} admini, ${managers.length} manageri)`);
    } catch (error) {
      this.logger.error(`[Consolidat] Eroare raport seara: ${error.message}`);
    }
  }

  // ============== HELPER: Trimite raport zilnic consolidat ==============

  private async sendConsolidatedDaily(recipients: User[]): Promise<number> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const dateStr = today.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formatTime = (d: Date) => d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' });

    // Collect all data in parallel
    const [
      cashData,
      parkingData,
      unresolvedData,
      handicapData,
      gpsData,
      missingReportsData,
      pvDisplayData,
      controlSesizariData,
    ] = await Promise.all([
      this.collectCashData(startOfDay, endOfDay),
      this.collectParkingData(startOfDay, endOfDay, formatTime),
      this.collectUnresolvedData(),
      this.collectHandicapData(today, startOfDay, endOfDay),
      this.collectGpsData(today),
      this.collectMissingReportsData(today),
      this.collectPvDisplayData(today),
      this.collectControlSesizariData(startOfDay, endOfDay),
    ]);

    let sentCount = 0;
    for (const recipient of recipients) {
      try {
        const success = await this.emailService.sendConsolidatedDailyReport({
          recipientEmail: recipient.email,
          recipientName: recipient.fullName,
          reportDate: dateStr,
          cashReport: cashData,
          parkingSummary: parkingData,
          unresolvedItems: unresolvedData,
          handicapReport: handicapData,
          gpsReport: gpsData,
          missingDailyReports: missingReportsData,
          pvDisplayReport: pvDisplayData,
          controlSesizariReport: controlSesizariData,
        });
        if (success) sentCount++;
      } catch (err) {
        this.logger.error(`[Consolidat] Eroare trimitere catre ${recipient.email}: ${err.message}`);
      }
    }

    return sentCount;
  }

  // ============== CRON 3: Raport saptamanal consolidat (Vineri 20:30) — Admini + Manageri ==============

  @Cron('30 20 * * 5', { timeZone: 'Europe/Bucharest' })
  async handleConsolidatedWeeklyReport() {
    this.logger.log('[Consolidat] Generare raport saptamanal pentru admini + manageri...');

    try {
      // Calculate week range: Monday → Friday
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sunday, 5=Friday
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);
      const friday = new Date(now);
      friday.setHours(23, 59, 59, 999);

      const mondayStr = monday.toISOString().split('T')[0];
      const fridayStr = friday.toISOString().split('T')[0];

      // Get weekly reports for admin
      const allReports = await this.dailyReportsService.getWeeklyReportsForAdmin(monday, friday);

      // Calculate missing reports per day
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
            this.logger.error(`[Consolidat] Eroare rapoarte lipsa ${dateStr}: ${error.message}`);
          }
        }
        current.setDate(current.getDate() + 1);
      }

      const emailData = this.buildWeeklyEmailData(allReports, mondayStr, fridayStr, missingByDate);

      // Get active admins + managers
      const [admins, managers] = await Promise.all([
        this.userRepository.find({ where: { role: UserRole.ADMIN, isActive: true } }),
        this.userRepository.find({ where: { role: UserRole.MANAGER, isActive: true } }),
      ]);

      const recipients = [...admins, ...managers];
      if (recipients.length === 0) {
        this.logger.warn('[Consolidat] Nu exista admini sau manageri activi pentru raport saptamanal');
        return;
      }

      let sentCount = 0;
      for (const recipient of recipients) {
        try {
          const success = await this.emailService.sendConsolidatedWeeklyReport({
            ...emailData,
            recipientEmail: recipient.email,
            recipientName: recipient.fullName,
          });
          if (success) sentCount++;
        } catch (err) {
          this.logger.error(`[Consolidat] Eroare weekly catre ${recipient.email}: ${err.message}`);
        }
      }

      this.logger.log(`[Consolidat] Raport saptamanal trimis la ${sentCount}/${recipients.length} (${admins.length} admini, ${managers.length} manageri)`);
    } catch (error) {
      this.logger.error(`[Consolidat] Eroare raport saptamanal: ${error.message}`);
    }
  }

  // ============== DATA COLLECTION METHODS ==============

  private async collectCashData(startOfDay: Date, endOfDay: Date) {
    try {
      const totals = await this.cashCollectionsService.getTotals({
        startDate: startOfDay,
        endDate: endOfDay,
      });

      if (totals.count === 0) return null;

      return {
        totalAmount: totals.totalAmount,
        collectionCount: totals.count,
        byParkingLot: totals.byParkingLot.map(lot => ({
          parkingLotName: lot.parkingLotName,
          totalAmount: lot.totalAmount,
          count: lot.count,
        })),
      };
    } catch (err) {
      this.logger.error(`[Admin Consolidat] Eroare colectare incasari: ${err.message}`);
      return null;
    }
  }

  private async collectParkingData(startOfDay: Date, endOfDay: Date, formatTime: (d: Date) => string) {
    try {
      const [newIssues, resolvedIssues, newDamages, resolvedDamages, unresolvedIssuesCount, unresolvedDamagesCount, urgentIssuesCount, urgentDamagesCount] = await Promise.all([
        this.parkingIssueRepository.find({
          where: { createdAt: Between(startOfDay, endOfDay) },
          relations: ['parkingLot', 'creator'],
          order: { createdAt: 'ASC' },
        }),
        this.parkingIssueRepository.find({
          where: { resolvedAt: Between(startOfDay, endOfDay) },
          relations: ['parkingLot', 'resolver'],
          order: { resolvedAt: 'ASC' },
        }),
        this.parkingDamageRepository.find({
          where: { createdAt: Between(startOfDay, endOfDay) },
          relations: ['parkingLot', 'creator'],
          order: { createdAt: 'ASC' },
        }),
        this.parkingDamageRepository.find({
          where: { resolvedAt: Between(startOfDay, endOfDay) },
          relations: ['parkingLot', 'resolver'],
          order: { resolvedAt: 'ASC' },
        }),
        this.parkingIssueRepository.count({ where: { status: 'ACTIVE' as any } }),
        this.parkingDamageRepository.count({ where: { status: 'ACTIVE' as any } }),
        this.parkingIssueRepository.count({ where: { status: 'ACTIVE' as any, isUrgent: true } }),
        this.parkingDamageRepository.count({ where: { status: 'ACTIVE' as any, isUrgent: true } }),
      ]);

      const hasData = newIssues.length > 0 || resolvedIssues.length > 0 || newDamages.length > 0 || resolvedDamages.length > 0 || unresolvedIssuesCount > 0 || unresolvedDamagesCount > 0;
      if (!hasData) return null;

      return {
        newIssues: newIssues.map(i => ({
          parkingLotName: i.parkingLot?.name || 'N/A',
          equipment: i.equipment,
          description: i.description,
          creatorName: i.creator?.fullName || 'N/A',
          createdAt: formatTime(new Date(i.createdAt)),
          isUrgent: i.isUrgent || false,
        })),
        resolvedIssues: resolvedIssues.map(i => ({
          parkingLotName: i.parkingLot?.name || 'N/A',
          equipment: i.equipment,
          resolverName: i.resolver?.fullName || 'N/A',
          resolvedAt: formatTime(new Date(i.resolvedAt)),
          resolutionDescription: i.resolutionDescription,
        })),
        newDamages: newDamages.map(d => ({
          parkingLotName: d.parkingLot?.name || 'N/A',
          damagedEquipment: d.damagedEquipment,
          personName: d.personName,
          carPlate: d.carPlate,
          description: d.description,
          creatorName: d.creator?.fullName || 'N/A',
          createdAt: formatTime(new Date(d.createdAt)),
          isUrgent: d.isUrgent || false,
        })),
        resolvedDamages: resolvedDamages.map(d => ({
          parkingLotName: d.parkingLot?.name || 'N/A',
          damagedEquipment: d.damagedEquipment,
          resolverName: d.resolver?.fullName || 'N/A',
          resolvedAt: formatTime(new Date(d.resolvedAt)),
          resolutionType: d.resolutionType,
          resolutionDescription: d.resolutionDescription,
        })),
        stillUnresolved: {
          issuesCount: unresolvedIssuesCount,
          damagesCount: unresolvedDamagesCount,
          urgentCount: urgentIssuesCount + urgentDamagesCount,
        },
      };
    } catch (err) {
      this.logger.error(`[Admin Consolidat] Eroare colectare parcari: ${err.message}`);
      return null;
    }
  }

  private async collectUnresolvedData() {
    try {
      const [activeIssues, activeDamages] = await Promise.all([
        this.parkingIssuesService.findAll('ACTIVE'),
        this.parkingDamagesService.findAllActive(),
      ]);

      if (activeIssues.length === 0 && activeDamages.length === 0) return null;

      const now = new Date();

      return {
        issues: activeIssues.map(issue => {
          const createdAt = new Date(issue.createdAt);
          const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          return {
            parkingLotName: issue.parkingLot?.name || 'N/A',
            equipment: issue.equipment,
            createdAt: createdAt.toLocaleDateString('ro-RO'),
            daysOpen,
            isUrgent: issue.isUrgent,
          };
        }),
        damages: activeDamages.map(damage => {
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
        }),
      };
    } catch (err) {
      this.logger.error(`[Admin Consolidat] Eroare colectare nerezolvate: ${err.message}`);
      return null;
    }
  }

  private async collectHandicapData(today: Date, startOfDay: Date, endOfDay: Date) {
    try {
      const now = new Date();
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const [
        createdToday,
        resolvedToday,
        allActive,
        allHandicapLegitimations,
        allRevolutionarLegitimations,
      ] = await Promise.all([
        this.handicapRequestRepository.find({
          where: { createdAt: Between(startOfDay, endOfDay) },
          relations: ['creator'],
          order: { createdAt: 'DESC' },
        }),
        this.handicapRequestRepository.find({
          where: { status: 'FINALIZAT', resolvedAt: Between(startOfDay, endOfDay) },
          relations: ['creator', 'resolver'],
          order: { resolvedAt: 'DESC' },
        }),
        this.handicapRequestRepository.find({
          where: { status: 'ACTIVE' },
          relations: ['creator'],
          order: { createdAt: 'ASC' },
        }),
        this.handicapLegitimationRepository.find({
          where: { status: 'ACTIVE' },
          relations: ['creator'],
          order: { createdAt: 'DESC' },
        }),
        this.revolutionarLegitimationRepository.find({
          where: { status: 'ACTIVE' },
          relations: ['creator'],
          order: { createdAt: 'DESC' },
        }),
      ]);

      // Separate active into normal and expired
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

      const hasData = createdToday.length > 0 || resolvedToday.length > 0 || allActive.length > 0 ||
        allHandicapLegitimations.length > 0 || allRevolutionarLegitimations.length > 0;

      if (!hasData) return null;

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

      return {
        createdToday: createdToday.map(formatRequest),
        resolvedToday: resolvedToday.map(r => ({
          ...formatRequest(r),
          resolvedBy: r.resolver?.fullName || 'N/A',
          resolutionDescription: r.resolutionDescription || '-',
        })),
        activeRequests: activeNormal.map(formatRequest),
        expiredRequests: expired.map(formatRequest),
        legitimations: allHandicapLegitimations.map(leg => ({
          personName: leg.personName,
          carPlate: leg.carPlate,
          certificateNumber: leg.handicapCertificateNumber,
          createdAt: new Date(leg.createdAt).toLocaleDateString('ro-RO'),
          createdBy: leg.creator?.fullName || 'N/A',
        })),
        revolutionarLegitimations: allRevolutionarLegitimations.map(leg => ({
          personName: leg.personName,
          carPlate: leg.carPlate,
          lawNumber: leg.lawNumber,
          createdAt: new Date(leg.createdAt).toLocaleDateString('ro-RO'),
          createdBy: leg.creator?.fullName || 'N/A',
        })),
        summary: {
          createdTodayCount: createdToday.length,
          resolvedTodayCount: resolvedToday.length,
          activeCount: activeNormal.length,
          expiredCount: expired.length,
          legitimationsCount: allHandicapLegitimations.length,
          revolutionarLegitimationsCount: allRevolutionarLegitimations.length,
        },
      };
    } catch (err) {
      this.logger.error(`[Admin Consolidat] Eroare colectare handicap: ${err.message}`);
      return null;
    }
  }

  private async collectGpsData(today: Date) {
    try {
      const reportData = await this.timeTrackingService.getDailyGpsReport(today);
      if (!reportData) return null;
      return {
        employees: reportData.employees,
        summary: reportData.summary,
      };
    } catch (err) {
      this.logger.error(`[Admin Consolidat] Eroare colectare GPS: ${err.message}`);
      return null;
    }
  }

  private async collectMissingReportsData(today: Date) {
    try {
      const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
      const missingUsers = await this.dailyReportsService.getMissingReports(todayStr);
      return missingUsers.map(u => ({
        userName: u.fullName,
        departmentName: u.department?.name || 'Necunoscut',
      }));
    } catch (err) {
      this.logger.error(`[Admin Consolidat] Eroare colectare rapoarte lipsa: ${err.message}`);
      return [];
    }
  }

  private async collectPvDisplayData(today: Date) {
    try {
      const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });

      // Sesiuni active (nu COMPLETED)
      const activeSessions = await this.pvDisplaySessionRepository.count({
        where: [
          { status: PV_SESSION_STATUS.DRAFT as any },
          { status: PV_SESSION_STATUS.READY as any },
          { status: PV_SESSION_STATUS.IN_PROGRESS as any },
        ],
      });

      // Zile de azi
      const todayDays = await this.pvDisplayDayRepository.createQueryBuilder('day')
        .leftJoinAndSelect('day.controlUser1', 'cu1')
        .leftJoinAndSelect('day.controlUser2', 'cu2')
        .where('day.displayDate = :today', { today: todayStr })
        .orderBy('day.dayOrder', 'ASC')
        .getMany();

      // Zile viitoare nefinalizate
      const upcomingDays = await this.pvDisplayDayRepository.createQueryBuilder('day')
        .where('day.displayDate > :today', { today: todayStr })
        .andWhere('day.status != :completed', { completed: PV_DAY_STATUS.COMPLETED })
        .getCount();

      // Finalizate azi
      const completedToday = todayDays.filter(d => d.status === PV_DAY_STATUS.COMPLETED).length;

      if (activeSessions === 0 && todayDays.length === 0) {
        return null;
      }

      return {
        activeSessions,
        todayDays: todayDays.map(d => ({
          dayOrder: d.dayOrder,
          displayDate: new Date(d.displayDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          status: PV_DAY_STATUS_LABELS[d.status] || d.status,
          controlUser1Name: d.controlUser1?.fullName,
          controlUser2Name: d.controlUser2?.fullName,
        })),
        upcomingDays,
        completedToday,
      };
    } catch (err) {
      this.logger.error(`[Admin Consolidat] Eroare colectare PV display: ${err.message}`);
      return null;
    }
  }

  private async collectControlSesizariData(startOfDay: Date, endOfDay: Date) {
    try {
      const [createdToday, resolvedToday, activeTotal] = await Promise.all([
        this.controlSesizareRepository.find({
          where: { createdAt: Between(startOfDay, endOfDay) },
          relations: ['creator'],
          order: { createdAt: 'DESC' },
        }),
        this.controlSesizareRepository.find({
          where: { status: 'FINALIZAT' as any, resolvedAt: Between(startOfDay, endOfDay) },
          relations: ['creator', 'resolver'],
          order: { resolvedAt: 'DESC' },
        }),
        this.controlSesizareRepository.find({
          where: { status: 'ACTIVE' },
          relations: ['creator'],
          order: { createdAt: 'ASC' },
        }),
      ]);

      if (createdToday.length === 0 && resolvedToday.length === 0 && activeTotal.length === 0) {
        return null;
      }

      const activeMarcaje = activeTotal.filter(s => s.type === 'MARCAJ').length;
      const activePanouri = activeTotal.filter(s => s.type === 'PANOU').length;

      return {
        createdToday: createdToday.map(s => ({
          type: CONTROL_SESIZARE_TYPE_LABELS[s.type] || s.type,
          zone: s.zone,
          location: s.location,
          createdBy: s.creator?.fullName || 'N/A',
        })),
        resolvedToday: resolvedToday.map(s => ({
          type: CONTROL_SESIZARE_TYPE_LABELS[s.type] || s.type,
          zone: s.zone,
          location: s.location,
          resolvedBy: s.resolver?.fullName || 'N/A',
          resolutionDescription: s.resolutionDescription || '-',
        })),
        summary: {
          createdTodayCount: createdToday.length,
          resolvedTodayCount: resolvedToday.length,
          activeTotalCount: activeTotal.length,
          activeMarcaje,
          activePanouri,
        },
      };
    } catch (err) {
      this.logger.error(`[Admin Consolidat] Eroare colectare control sesizari: ${err.message}`);
      return null;
    }
  }

  // ============== WEEKLY DATA BUILD ==============

  private buildWeeklyEmailData(
    reports: DailyReport[],
    weekStartDate: string,
    weekEndDate: string,
    missingByDate: Map<string, Array<{ userName: string; departmentName: string }>>,
  ) {
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
