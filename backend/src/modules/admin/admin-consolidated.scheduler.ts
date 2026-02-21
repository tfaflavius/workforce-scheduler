import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
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
import { HANDICAP_REQUEST_TYPE_LABELS } from '../parking/constants/parking.constants';

/**
 * Admin Consolidated Scheduler
 *
 * Sends consolidated email reports to admins:
 * 1. Daily consolidated report (Mon-Fri 20:00) — combines all individual reports
 * 2. Weekly consolidated report (Friday 20:00) — weekly summary of daily reports
 *
 * Individual emails to managers, department users, etc. remain unchanged.
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
    private readonly cashCollectionsService: CashCollectionsService,
    private readonly parkingIssuesService: ParkingIssuesService,
    private readonly parkingDamagesService: ParkingDamagesService,
    private readonly timeTrackingService: TimeTrackingService,
    private readonly dailyReportsService: DailyReportsService,
  ) {}

  // ============== CRON 1: Raport zilnic consolidat ==============

  @Cron('0 20 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async handleConsolidatedDailyReport() {
    this.logger.log('[Admin Consolidat] Generare raport zilnic consolidat...');

    try {
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
      ] = await Promise.all([
        this.collectCashData(startOfDay, endOfDay),
        this.collectParkingData(startOfDay, endOfDay, formatTime),
        this.collectUnresolvedData(),
        this.collectHandicapData(today, startOfDay),
        this.collectGpsData(today),
        this.collectMissingReportsData(today),
      ]);

      // Get active admins
      const admins = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      if (admins.length === 0) {
        this.logger.warn('[Admin Consolidat] Nu exista admini activi');
        return;
      }

      let sentCount = 0;
      for (const admin of admins) {
        try {
          const success = await this.emailService.sendConsolidatedDailyReport({
            recipientEmail: admin.email,
            recipientName: admin.fullName,
            reportDate: dateStr,
            cashReport: cashData,
            parkingSummary: parkingData,
            unresolvedItems: unresolvedData,
            handicapReport: handicapData,
            gpsReport: gpsData,
            missingDailyReports: missingReportsData,
          });
          if (success) sentCount++;
        } catch (err) {
          this.logger.error(`[Admin Consolidat] Eroare trimitere catre ${admin.email}: ${err.message}`);
        }
      }

      this.logger.log(`[Admin Consolidat] Raport zilnic trimis la ${sentCount}/${admins.length} admini`);
    } catch (error) {
      this.logger.error(`[Admin Consolidat] Eroare raport zilnic: ${error.message}`);
    }
  }

  // ============== CRON 2: Raport saptamanal consolidat (Vineri) ==============

  @Cron('0 20 * * 5', { timeZone: 'Europe/Bucharest' })
  async handleConsolidatedWeeklyReport() {
    this.logger.log('[Admin Consolidat] Generare raport saptamanal consolidat...');

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
            this.logger.error(`[Admin Consolidat] Eroare rapoarte lipsa ${dateStr}: ${error.message}`);
          }
        }
        current.setDate(current.getDate() + 1);
      }

      const emailData = this.buildWeeklyEmailData(allReports, mondayStr, fridayStr, missingByDate);

      // Get active admins
      const admins = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      if (admins.length === 0) {
        this.logger.warn('[Admin Consolidat] Nu exista admini activi pentru raport saptamanal');
        return;
      }

      let sentCount = 0;
      for (const admin of admins) {
        try {
          const success = await this.emailService.sendConsolidatedWeeklyReport({
            ...emailData,
            recipientEmail: admin.email,
            recipientName: admin.fullName,
          });
          if (success) sentCount++;
        } catch (err) {
          this.logger.error(`[Admin Consolidat] Eroare weekly catre ${admin.email}: ${err.message}`);
        }
      }

      this.logger.log(`[Admin Consolidat] Raport saptamanal trimis la ${sentCount}/${admins.length} admini`);
    } catch (error) {
      this.logger.error(`[Admin Consolidat] Eroare raport saptamanal: ${error.message}`);
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

  private async collectHandicapData(today: Date, startOfDay: Date) {
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
          where: { createdAt: MoreThan(startOfDay) },
          relations: ['creator'],
          order: { createdAt: 'DESC' },
        }),
        this.handicapRequestRepository.find({
          where: { status: 'FINALIZAT', resolvedAt: MoreThan(startOfDay) },
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
      const todayStr = today.toISOString().split('T')[0];
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
