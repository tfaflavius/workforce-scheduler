import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PvSigningDay } from './entities/pv-signing-day.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { PvSigningService } from './pv-signing.service';
import {
  PV_DAY_STATUS,
  PvDayStatus,
} from './constants/parking.constants';

@Injectable()
export class PvSigningScheduler {
  private readonly logger = new Logger(PvSigningScheduler.name);

  constructor(
    @InjectRepository(PvSigningDay)
    private readonly dayRepository: Repository<PvSigningDay>,
    private readonly notificationsService: NotificationsService,
    private readonly pvSigningService: PvSigningService,
  ) {}

  @Cron('30 7 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async handleDailySigningReminder() {
    this.logger.log('PV Signing Scheduler: verificare zile de semnare pentru azi...');

    try {
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });

      const todayDays = await this.dayRepository.createQueryBuilder('day')
        .leftJoinAndSelect('day.session', 'session')
        .leftJoinAndSelect('day.maintenanceUser1', 'maintenanceUser1')
        .where('day.signingDate = :today', { today: todayStr })
        .andWhere('day.status = :status', { status: PV_DAY_STATUS.ASSIGNED })
        .getMany();

      if (todayDays.length === 0) {
        this.logger.log('PV Signing Scheduler: nicio zi de semnare pentru azi');
        return;
      }

      this.logger.log(`PV Signing Scheduler: ${todayDays.length} zile de semnare pentru azi`);

      for (const day of todayDays) {
        day.status = PV_DAY_STATUS.IN_PROGRESS as PvDayStatus;
        await this.dayRepository.save(day);

        await this.pvSigningService.recalculateSessionStatus(day.sessionId);

        if (day.maintenanceUser1Id) {
          await this.notificationsService.createMany([{
            userId: day.maintenanceUser1Id,
            type: NotificationType.PV_SESSION_ASSIGNED,
            title: 'Azi ai semnare procese verbale',
            message: `Ziua ${day.dayOrder} de semnare PV este programata pentru azi (${this.formatDate(day.signingDate)}). ${day.noticeCount} procese verbale de semnat.`,
            data: { pvDayId: day.id, pvSessionId: day.sessionId },
          }]);
        }

        this.logger.log(`PV Signing Scheduler: zi ${day.id} marcata IN_PROGRESS`);
      }
    } catch (error) {
      this.logger.error(`PV Signing Scheduler error: ${error.message}`, error.stack);
    }
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
