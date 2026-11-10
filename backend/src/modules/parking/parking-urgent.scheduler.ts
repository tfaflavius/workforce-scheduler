import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ParkingIssuesService } from './parking-issues.service';
import { ParkingDamagesService } from './parking-damages.service';
import { HandicapRequestsService } from './handicap-requests.service';
import { HandicapLegitimationsService } from './handicap-legitimations.service';
import { RevolutionarLegitimationsService } from './revolutionar-legitimations.service';
import { EmailService } from '../../common/email/email.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { HandicapRequest } from './entities/handicap-request.entity';
import { HandicapLegitimation } from './entities/handicap-legitimation.entity';
import { RevolutionarLegitimation } from './entities/revolutionar-legitimation.entity';
import {
  HANDICAP_PARKING_DEPARTMENT_NAME,
  HANDICAP_REQUEST_TYPE_LABELS,
} from './constants/parking.constants';

@Injectable()
export class ParkingUrgentScheduler {
  private readonly logger = new Logger(ParkingUrgentScheduler.name);

  constructor(
    private readonly parkingIssuesService: ParkingIssuesService,
    private readonly parkingDamagesService: ParkingDamagesService,
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
  @Cron('0 8,13 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async handleMarkUrgent() {
    this.logger.log('Verificare probleme si prejudicii nerezolvate de 48h+...');

    try {
      const issuesMarked = await this.parkingIssuesService.markUrgentIssues();
      const damagesMarked = await this.parkingDamagesService.markUrgentDamages();

      if (issuesMarked > 0 || damagesMarked > 0) {
        this.logger.log(
          `Marcate ca urgente: ${issuesMarked} probleme, ${damagesMarked} prejudicii`,
        );
      }
    } catch (error) {
      this.logger.error('Eroare la marcarea problemelor urgente:', error);
    }
  }

  // NOTA: reminder-ele de la 08:00 si 13:00 (in-app pentru fiecare problema urgenta +
  // email cu toate problemele nerezolvate) au fost eliminate - erau spam zilnic.
  // Toate problemele deschise ajung acum intr-un SINGUR rezumat la 08:00
  // (vezi DailyDigestScheduler din modulul admin).

  // Ruleaza doar in zilele lucratoare (Luni-Vineri) la 09:00 pentru raportul Handicap catre Parcari Handicap
  // Adminii si Managerii primesc datele handicap in raportul consolidat
  @Cron('0 9 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async handleDailyHandicapReport() {
    this.logger.log('Generare raport zilnic Handicap pentru Parcari Handicap (zile lucratoare)...');

    try {
      await this.sendDailyHandicapReportToAdminAndHandicapDept();
      this.logger.log('Raport zilnic Handicap trimis cu succes');
    } catch (error) {
      this.logger.error('Eroare la trimiterea raportului Handicap:', error);
    }
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
          createdAt: Between(today, tomorrow),
        },
        relations: ['creator'],
        order: { createdAt: 'DESC' },
      }),
      // Finalizate azi
      this.handicapRequestRepository.find({
        where: {
          status: 'FINALIZAT',
          resolvedAt: Between(today, tomorrow),
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

    // Obtine userii din departamentul Parcari Handicap (adminii primesc raport consolidat la 20:00)
    const handicapDept = await this.departmentRepository.findOne({
      where: { name: HANDICAP_PARKING_DEPARTMENT_NAME },
    });

    const handicapDeptUsers = handicapDept
      ? await this.userRepository.find({
          where: { departmentId: handicapDept.id, isActive: true },
        })
      : [];

    const allRecipients = [...handicapDeptUsers];

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
        resolvedToday: resolvedToday.map((r) => ({
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
        `(${handicapDeptUsers.length} Parcari Handicap, admini primesc raport consolidat). ` +
        `Create azi: ${createdToday.length}, Finalizate azi: ${resolvedToday.length}, ` +
        `Active: ${activeNormal.length}, Expirate: ${expired.length}, ` +
        `Legitimatii Handicap: ${allHandicapLegitimations.length}, Legitimatii Revolutionar: ${allRevolutionarLegitimations.length}`,
    );
  }
}
