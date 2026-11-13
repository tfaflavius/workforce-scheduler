import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { ControlSesizare } from '../parking/entities/control-sesizare.entity';
import { HandicapRequest } from '../parking/entities/handicap-request.entity';
import { DomiciliuRequest } from '../parking/entities/domiciliu-request.entity';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import {
  ShiftSwapRequest,
  ShiftSwapStatus,
} from '../shift-swaps/entities/shift-swap-request.entity';
import { EditRequest } from '../parking/entities/edit-request.entity';
import { ParkingIssuesService } from '../parking/parking-issues.service';
import { ParkingDamagesService } from '../parking/parking-damages.service';
import { TimeTrackingService } from '../time-tracking/time-tracking.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { EmailService } from '../../common/email/email.service';
import { managerDeptScope, inManagerScope } from '../../common/utils/manager-scope';
import {
  DISPECERAT_DEPARTMENT_NAME,
  MAINTENANCE_DEPARTMENT_NAME,
} from '../parking/constants/parking.constants';

type DigestSection = { title: string; summary?: string; items: string[]; moreCount?: number };

const MAX_ITEMS_PER_SECTION = 25;
const STANDARD_WORK_MINUTES = 8 * 60;
const UNDER_8H_TOLERANCE_MIN = 15;

/**
 * Rezumat zilnic (Luni-Vineri, 08:00).
 *
 * Inlocuieste notificarile repetitive (reminder-ele de la 08:00 si 13:00 pentru fiecare
 * problema nerezolvata, raportul GPS de la 16:00, raportul de dimineata pentru manageri).
 * Fiecare utilizator primeste O SINGURA notificare (in-app + push) si UN SINGUR email,
 * cu toate problemele care il privesc:
 *  - Admin / Manager: probleme + prejudicii deschise, solicitari active, aprobari in
 *    asteptare si TOATE problemele GPS / pontaj din zilele lucratoare trecute.
 *  - Dispecerat: toate problemele si prejudiciile deschise.
 *  - Intretinere Parcari: problemele deschise asignate lor.
 *
 * Evenimentele noi (o problema noua, o asignare etc.) vin in continuare imediat,
 * ca push + email, prin NotificationsService.
 */
@Injectable()
export class DailyDigestScheduler {
  private readonly logger = new Logger(DailyDigestScheduler.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(ControlSesizare)
    private readonly controlSesizareRepository: Repository<ControlSesizare>,
    @InjectRepository(HandicapRequest)
    private readonly handicapRequestRepository: Repository<HandicapRequest>,
    @InjectRepository(DomiciliuRequest)
    private readonly domiciliuRequestRepository: Repository<DomiciliuRequest>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(ShiftSwapRequest)
    private readonly shiftSwapRepository: Repository<ShiftSwapRequest>,
    @InjectRepository(EditRequest)
    private readonly editRequestRepository: Repository<EditRequest>,
    private readonly parkingIssuesService: ParkingIssuesService,
    private readonly parkingDamagesService: ParkingDamagesService,
    private readonly timeTrackingService: TimeTrackingService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 8 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async handleDailyDigest(): Promise<void> {
    try {
      const sent = await this.sendDigest(new Date());
      this.logger.log(`[Rezumat 08:00] Trimis la ${sent} utilizatori`);
    } catch (error) {
      this.logger.error(`[Rezumat 08:00] Eroare: ${error?.message}`, error?.stack);
    }
  }

  async sendDigest(now: Date): Promise<number> {
    const { periodStart, gpsDays } = this.getPeriod(now);
    const dateLabel = now.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Bucharest',
    });
    const periodLabel = `de la ${periodStart.toLocaleString('ro-RO', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Bucharest',
    })} pana acum`;

    // ---- Date comune ----
    const [activeIssues, activeDamages] = await Promise.all([
      this.parkingIssuesService.findAll('ACTIVE'),
      this.parkingDamagesService.findAllActive(),
    ]);

    const daysOpen = (d: Date) =>
      Math.floor((now.getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
    const fmtDate = (d: Date) =>
      new Date(d).toLocaleDateString('ro-RO', { timeZone: 'Europe/Bucharest' });

    const issueLine = (i: (typeof activeIssues)[number]) =>
      `${i.isUrgent ? '[URGENT] ' : ''}${i.parkingLot?.name || 'Parcare'} - ${i.equipment} ` +
      `(din ${fmtDate(i.createdAt)}, ${daysOpen(i.createdAt)} zile)` +
      `${i.assignee?.fullName ? ` - asignat: ${i.assignee.fullName}` : ''}`;
    const damageLine = (d: (typeof activeDamages)[number]) =>
      `${d.isUrgent ? '[URGENT] ' : ''}${d.parkingLot?.name || 'Parcare'} - ${d.damagedEquipment}` +
      `${d.carPlate ? ` (${d.carPlate})` : ''} (din ${fmtDate(d.createdAt)}, ${daysOpen(d.createdAt)} zile)`;

    const issuesSection = (issues: typeof activeIssues, title: string): DigestSection | null => {
      if (issues.length === 0) return null;
      const urgent = issues.filter((i) => i.isUrgent).length;
      const newCount = issues.filter((i) => new Date(i.createdAt) >= periodStart).length;
      return this.section(
        title,
        `${issues.length} deschise (${urgent} urgente, ${newCount} noi in perioada)`,
        issues.map(issueLine),
      );
    };
    const damagesSection = (damages: typeof activeDamages): DigestSection | null => {
      if (damages.length === 0) return null;
      const urgent = damages.filter((d) => d.isUrgent).length;
      return this.section(
        'Prejudicii nerezolvate',
        `${damages.length} deschise (${urgent} urgente)`,
        damages.map(damageLine),
      );
    };

    // ---- Destinatari ----
    const [adminsAndManagers, depts] = await Promise.all([
      this.userRepository.find({
        where: {
          role: In([UserRole.ADMIN, UserRole.MASTER_ADMIN, UserRole.MANAGER]),
          isActive: true,
        },
      }),
      this.departmentRepository.find({
        where: [{ name: DISPECERAT_DEPARTMENT_NAME }, { name: MAINTENANCE_DEPARTMENT_NAME }],
      }),
    ]);
    const dispeceratDept = depts.find((d) => d.name === DISPECERAT_DEPARTMENT_NAME);
    const maintenanceDept = depts.find((d) => d.name === MAINTENANCE_DEPARTMENT_NAME);
    const [dispeceratUsers, maintenanceUsers] = await Promise.all([
      dispeceratDept
        ? this.userRepository.find({ where: { departmentId: dispeceratDept.id, isActive: true } })
        : Promise.resolve([] as User[]),
      maintenanceDept
        ? this.userRepository.find({ where: { departmentId: maintenanceDept.id, isActive: true } })
        : Promise.resolve([] as User[]),
    ]);

    const digests = new Map<string, { user: User; sections: DigestSection[] }>();
    const add = (user: User, sections: Array<DigestSection | null>) => {
      if (digests.has(user.id)) return; // fiecare user primeste un singur rezumat
      const clean = sections.filter((s): s is DigestSection => !!s);
      if (clean.length > 0) digests.set(user.id, { user, sections: clean });
    };

    // Admin + Manager: tot
    if (adminsAndManagers.length > 0) {
      const gpsEntries = await this.collectGpsEntries(gpsDays);
      const commonSections = [
        issuesSection(activeIssues, 'Probleme parcari nerezolvate'),
        damagesSection(activeDamages),
        await this.collectRequestsSection(),
      ];
      const managementSections = [
        ...commonSections,
        await this.collectApprovalsSection(),
        this.gpsSection(gpsEntries),
      ];
      for (const u of adminsAndManagers) {
        // Managerii cu departamente alocate: aprobari + GPS doar din departamentele lor
        const scope = managerDeptScope(u);
        if (!scope) {
          add(u, managementSections);
          continue;
        }
        add(u, [
          ...commonSections,
          await this.collectApprovalsSection(scope),
          this.gpsSection(gpsEntries.filter((e) => inManagerScope(scope, e.departmentId))),
        ]);
      }
    }

    // Dispecerat: toate problemele + prejudiciile
    const dispSections = [
      issuesSection(activeIssues, 'Probleme parcari nerezolvate'),
      damagesSection(activeDamages),
    ];
    for (const u of dispeceratUsers) add(u, dispSections);

    // Intretinere: doar problemele asignate lor
    for (const u of maintenanceUsers) {
      add(u, [
        issuesSection(
          activeIssues.filter((i) => i.assignedTo === u.id),
          'Problemele tale nerezolvate',
        ),
      ]);
    }

    // ---- Trimitere: 1 notificare (in-app + push) + 1 email per user ----
    let sent = 0;
    for (const { user, sections } of digests.values()) {
      const message = sections
        .map((s) => `${s.title}: ${s.summary || `${s.items.length + (s.moreCount || 0)}`}`)
        .join('\n');
      try {
        await this.notificationsService.create({
          userId: user.id,
          type: NotificationType.DAILY_DIGEST,
          title: `Rezumat zilnic - ${dateLabel}`,
          message,
          data: { dailyDigest: true, date: dateLabel, url: '/notifications' },
          skipEmail: true, // emailul detaliat e trimis mai jos
        });
        if (user.email) {
          await this.emailService.sendDailyDigestEmail({
            recipientEmail: user.email,
            recipientName: user.fullName || user.email,
            dateLabel,
            periodLabel,
            sections,
          });
        }
        sent++;
      } catch (err) {
        this.logger.error(`[Rezumat 08:00] Eroare la ${user.email}: ${err?.message}`);
      }
    }
    return sent;
  }

  // ============== HELPERS ==============

  /**
   * Perioada acoperita: de la rezumatul anterior (ziua lucratoare precedenta, 08:00).
   * Lunea acopera si weekend-ul (de vineri 08:00).
   */
  private getPeriod(now: Date): { periodStart: Date; gpsDays: Date[] } {
    const bucharestDay = new Date(
      now.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }),
    ).getDay();
    const daysBack = bucharestDay === 1 ? 3 : 1;
    const periodStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Zilele pentru care se raporteaza GPS: fiecare zi din perioada, pana ieri inclusiv
    const gpsDays: Date[] = [];
    for (let i = daysBack; i >= 1; i--) {
      gpsDays.push(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    }
    return { periodStart, gpsDays };
  }

  private section(title: string, summary: string, lines: string[]): DigestSection {
    return {
      title,
      summary,
      items: lines.slice(0, MAX_ITEMS_PER_SECTION),
      moreCount: Math.max(0, lines.length - MAX_ITEMS_PER_SECTION),
    };
  }

  private async collectRequestsSection(): Promise<DigestSection | null> {
    try {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const [sesizari, handicap, domiciliu] = await Promise.all([
        this.controlSesizareRepository.find({ where: { status: 'ACTIVE' } as any }),
        this.handicapRequestRepository.find({ where: { status: 'ACTIVE' } as any }),
        this.domiciliuRequestRepository.find({ where: { status: 'ACTIVE' } as any }),
      ]);
      const lines: string[] = [];
      if (sesizari.length > 0) lines.push(`Sesizari Control active: ${sesizari.length}`);
      if (handicap.length > 0) {
        const expired = handicap.filter((h) => new Date(h.createdAt) < fiveDaysAgo).length;
        lines.push(
          `Solicitari Handicap active: ${handicap.length}${expired > 0 ? ` (${expired} mai vechi de 5 zile)` : ''}`,
        );
      }
      if (domiciliu.length > 0) {
        const overdue = domiciliu.filter(
          (d) => d.deadline && new Date(d.deadline).getTime() < Date.now(),
        ).length;
        lines.push(
          `Solicitari Domiciliu active: ${domiciliu.length}${overdue > 0 ? ` (${overdue} cu deadline depasit)` : ''}`,
        );
      }
      if (lines.length === 0) return null;
      return { title: 'Solicitari active', items: lines };
    } catch (err) {
      this.logger.error(`[Rezumat] Eroare solicitari: ${err?.message}`);
      return null;
    }
  }

  private async collectApprovalsSection(scope?: string[] | null): Promise<DigestSection | null> {
    try {
      const [leaves, swaps, edits] = await Promise.all([
        this.leaveRequestRepository.count({
          where: scope
            ? { status: 'PENDING', user: { departmentId: In(scope) } }
            : { status: 'PENDING' },
        }),
        this.shiftSwapRepository.count({ where: { status: ShiftSwapStatus.AWAITING_ADMIN } }),
        this.editRequestRepository.count({ where: { status: 'PENDING' } }),
      ]);
      const lines: string[] = [];
      if (leaves > 0) lines.push(`Cereri de concediu: ${leaves}`);
      if (swaps > 0) lines.push(`Schimburi de tura: ${swaps}`);
      if (edits > 0) lines.push(`Cereri de editare: ${edits}`);
      if (lines.length === 0) return null;
      return { title: 'Aprobari in asteptare', items: lines };
    } catch (err) {
      this.logger.error(`[Rezumat] Eroare aprobari: ${err?.message}`);
      return null;
    }
  }

  /** Toate problemele GPS / pontaj din zilele lucratoare trecute (doar admin + manager). */
  private async collectGpsEntries(
    days: Date[],
  ): Promise<Array<{ departmentId: string | null; line: string }>> {
    const entries: Array<{ departmentId: string | null; line: string }> = [];
    for (const day of days) {
      try {
        const report = await this.timeTrackingService.getDailyGpsReport(day);
        if (!report) continue;
        for (const emp of report.employees) {
          const problems: string[] = [];
          for (const sh of emp.shifts) {
            if (sh.gpsStatus === 'denied') problems.push('GPS blocat (permisiune refuzata)');
            else if (sh.gpsStatus === 'error') problems.push('eroare GPS');
            else if (sh.gpsStatus === 'unavailable') problems.push('GPS indisponibil');
            if (sh.locationCount === 0 && sh.durationMinutes > 15) {
              problems.push('nicio locatie inregistrata');
            }
            // Inchiderea automata de la 15:30 e normala (nu e problema GPS)
            if (
              sh.stoppedBySystem &&
              sh.systemStopReason &&
              !sh.systemStopReason.startsWith('Inchidere automata la sfarsitul programului')
            ) {
              problems.push(sh.systemStopReason);
            }
          }
          if (emp.totalDurationMinutes < STANDARD_WORK_MINUTES - UNDER_8H_TOLERANCE_MIN) {
            const hours = Math.round((emp.totalDurationMinutes / 60) * 100) / 100;
            problems.push(`sub 8h (${hours}h)`);
          }
          if (problems.length > 0) {
            entries.push({
              departmentId: emp.departmentId,
              line: `${report.date} - ${emp.name}: ${[...new Set(problems)].join('; ')}`,
            });
          }
        }
      } catch (err) {
        this.logger.error(`[Rezumat] Eroare GPS: ${err?.message}`);
      }
    }
    return entries;
  }

  private gpsSection(entries: Array<{ line: string }>): DigestSection | null {
    if (entries.length === 0) return null;
    return this.section(
      'GPS & pontaj',
      `${entries.length} situatii`,
      entries.map((e) => e.line),
    );
  }
}
