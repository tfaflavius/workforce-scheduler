import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PvDisplayDay } from './entities/pv-display-day.entity';
import { PvDisplaySession } from './entities/pv-display-session.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { PvDisplayService } from './pv-display.service';
import {
  PV_DAY_STATUS,
  PV_SESSION_STATUS,
  DISPECERAT_DEPARTMENT_NAME,
  PvDayStatus,
} from './constants/parking.constants';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';

@Injectable()
export class PvDisplayScheduler {
  private readonly logger = new Logger(PvDisplayScheduler.name);

  constructor(
    @InjectRepository(PvDisplayDay)
    private readonly dayRepository: Repository<PvDisplayDay>,
    @InjectRepository(PvDisplaySession)
    private readonly sessionRepository: Repository<PvDisplaySession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(ScheduleAssignment)
    private readonly scheduleAssignmentRepository: Repository<ScheduleAssignment>,
    private readonly notificationsService: NotificationsService,
    private readonly pvDisplayService: PvDisplayService,
  ) {}

  /**
   * Ruleaza zilnic la 07:30 (Luni-Vineri):
   * 1. Gaseste zilele ASSIGNED pentru azi → status IN_PROGRESS
   * 2. Notifica Control asignati (reminder)
   * 3. Notifica Dispecerat ca masina e indisponibila
   * 4. Update session status
   */
  @Cron('30 7 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async handleDailyPvReminder() {
    this.logger.log('PV Display Scheduler: verificare zile de afisare pentru azi...');

    try {
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });

      // Gaseste zilele de azi cu status ASSIGNED
      const todayDays = await this.dayRepository.createQueryBuilder('day')
        .leftJoinAndSelect('day.session', 'session')
        .leftJoinAndSelect('day.controlUser1', 'controlUser1')
        .leftJoinAndSelect('day.controlUser2', 'controlUser2')
        .where('day.displayDate = :today', { today: todayStr })
        .andWhere('day.status = :status', { status: PV_DAY_STATUS.ASSIGNED })
        .getMany();

      if (todayDays.length === 0) {
        this.logger.log('PV Display Scheduler: nicio zi de afisare pentru azi');
        return;
      }

      this.logger.log(`PV Display Scheduler: ${todayDays.length} zile de afisare pentru azi`);

      for (const day of todayDays) {
        // 1. Marcheaza ca IN_PROGRESS
        day.status = PV_DAY_STATUS.IN_PROGRESS as PvDayStatus;
        await this.dayRepository.save(day);

        // 2. Recalculeaza status sesiune
        await this.pvDisplayService.recalculateSessionStatus(day.sessionId);

        const notifications: any[] = [];

        // 3. Notifica utilizatorii Control asignati
        const controlUserIds = [day.controlUser1Id, day.controlUser2Id].filter(Boolean);
        for (const userId of controlUserIds) {
          notifications.push({
            userId,
            type: NotificationType.GENERAL,
            title: 'Azi ai afisare procese verbale',
            message: `Ziua ${day.dayOrder} de afisare PV este programata pentru azi (${this.formatDate(day.displayDate)}). ${day.noticeCount} procese verbale de afisat.`,
            data: { pvDayId: day.id, pvSessionId: day.sessionId },
          });
        }

        // 4. Notifica Dispecerat (masina indisponibila)
        await this.notifyDispeceratCarUnavailable(day, notifications);

        if (notifications.length > 0) {
          await this.notificationsService.createMany(notifications);
        }

        this.logger.log(`PV Display Scheduler: zi ${day.id} marcata IN_PROGRESS, ${notifications.length} notificari trimise`);
      }
    } catch (error) {
      this.logger.error(`PV Display Scheduler error: ${error.message}`, error.stack);
    }
  }

  /**
   * Notifica dispeceratul ca masina este indisponibila
   * Cauta dispecerii pe tura in acea zi
   */
  private async notifyDispeceratCarUnavailable(day: PvDisplayDay, notifications: any[]): Promise<void> {
    try {
      const dispeceratDept = await this.departmentRepository.findOne({
        where: { name: DISPECERAT_DEPARTMENT_NAME },
      });

      if (!dispeceratDept) return;

      // Gaseste utilizatorii din Dispecerat care sunt programati azi
      const todayStr = day.displayDate instanceof Date
        ? day.displayDate.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' })
        : String(day.displayDate);

      const assignments = await this.scheduleAssignmentRepository.createQueryBuilder('sa')
        .leftJoinAndSelect('sa.user', 'user')
        .leftJoinAndSelect('user.department', 'department')
        .where('sa.shiftDate = :date', { date: todayStr })
        .andWhere('sa.isRestDay = false')
        .andWhere('sa.leaveType IS NULL')
        .andWhere('department.name = :deptName', { deptName: DISPECERAT_DEPARTMENT_NAME })
        .getMany();

      for (const assignment of assignments) {
        if (assignment.user) {
          notifications.push({
            userId: assignment.user.id,
            type: NotificationType.GENERAL,
            title: 'Masina indisponibila - Afisare PV',
            message: `Masina va fi indisponibila astazi (estimativ pana la ~15:00) pentru afisarea proceselor verbale.`,
            data: { pvDayId: day.id, pvSessionId: day.sessionId },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error notifying Dispecerat: ${error.message}`);
    }
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
