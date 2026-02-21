import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { PushNotificationService } from '../notifications/push-notification.service';
import { TimeTrackingService } from './time-tracking.service';
import { EmailService } from '../../common/email/email.service';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * GPS Tracking Scheduler
 *
 * Sends silent push notifications every 10 minutes to employees
 * with active time entries (pontaj started, not stopped).
 *
 * The push notification triggers the Service Worker in the employee's browser,
 * which then captures GPS location and sends it to the backend.
 *
 * This is the only reliable way to get GPS data on mobile phones,
 * because mobile browsers kill JavaScript timers when the screen is off.
 */
@Injectable()
export class GpsTrackingScheduler {
  private readonly logger = new Logger(GpsTrackingScheduler.name);

  constructor(
    @InjectRepository(TimeEntry)
    private timeEntryRepository: Repository<TimeEntry>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private pushNotificationService: PushNotificationService,
    private timeTrackingService: TimeTrackingService,
    private emailService: EmailService,
  ) {}

  // Run every 10 minutes, every day
  @Cron('*/10 * * * *', { timeZone: 'Europe/Bucharest' })
  async triggerGpsCapture() {
    try {
      // Find all active time entries (started but not stopped)
      // Only for departments that need GPS tracking
      const activeEntries = await this.timeEntryRepository
        .createQueryBuilder('entry')
        .leftJoinAndSelect('entry.user', 'user')
        .leftJoinAndSelect('user.department', 'department')
        .where('entry.end_time IS NULL')
        .andWhere('department.name IN (:...deptNames)', {
          deptNames: ['Intretinere Parcari', 'Control'],
        })
        .getMany();

      if (activeEntries.length === 0) {
        return;
      }

      this.logger.log(`[GPS Cron] Sending GPS capture push to ${activeEntries.length} active employees`);

      // Send silent push to each active employee
      const sendPromises = activeEntries.map(async (entry) => {
        try {
          await this.pushNotificationService.sendToUser(
            entry.userId,
            'GPS',
            'Inregistrare locatie automata',
            {
              action: 'GPS_CAPTURE',
              timeEntryId: entry.id,
              userId: entry.userId,
              silent: true,
            },
          );
        } catch (err) {
          this.logger.debug(`[GPS Cron] Failed to send push to ${entry.user?.fullName}: ${err.message}`);
        }
      });

      await Promise.all(sendPromises);
      this.logger.log(`[GPS Cron] Push notifications sent to ${activeEntries.length} employees`);
    } catch (error) {
      this.logger.error(`[GPS Cron] Error: ${error.message}`);
    }
  }

  /**
   * Auto-stop shifts without GPS data.
   * Runs every 5 minutes. If an active shift has no GPS location for 30+ minutes,
   * the system automatically stops it and notifies admin + employee.
   */
  @Cron('*/5 * * * *', { timeZone: 'Europe/Bucharest' })
  async autoStopNoGpsShifts() {
    try {
      const stoppedCount = await this.timeTrackingService.autoStopShiftsWithoutGps(30);
      if (stoppedCount > 0) {
        this.logger.warn(`[GPS Auto-Stop] Stopped ${stoppedCount} shifts due to missing GPS data`);
      }
    } catch (error) {
      this.logger.error(`[GPS Auto-Stop] Error: ${error.message}`);
    }
  }

  /**
   * Daily GPS report email.
   * Runs weekdays (Mon-Fri) at 21:00 Europe/Bucharest.
   * Sends an email to all admins with GPS tracking summary for the day:
   * - Per employee: shifts, GPS locations, streets visited, GPS status
   * - Summary: total employees, shifts, GPS problems, auto-stopped shifts
   */
  @Cron('0 21 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async handleDailyGpsReport() {
    this.logger.log('[GPS Daily Report] Generating daily GPS report...');

    try {
      const today = new Date();
      const reportData = await this.timeTrackingService.getDailyGpsReport(today);

      if (!reportData) {
        this.logger.log('[GPS Daily Report] No GPS entries for today, skipping email');
        return;
      }

      // Find all active admins
      const admins = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      if (admins.length === 0) {
        this.logger.warn('[GPS Daily Report] No active admins found');
        return;
      }

      let sentCount = 0;
      for (const admin of admins) {
        try {
          const success = await this.emailService.sendDailyGpsReport({
            recipientEmail: admin.email,
            recipientName: admin.fullName,
            reportDate: reportData.date,
            employees: reportData.employees,
            summary: reportData.summary,
          });
          if (success) sentCount++;
        } catch (err) {
          this.logger.error(`[GPS Daily Report] Failed to send to ${admin.email}: ${err.message}`);
        }
      }

      this.logger.log(`[GPS Daily Report] Sent to ${sentCount}/${admins.length} admins`);
    } catch (error) {
      this.logger.error(`[GPS Daily Report] Error: ${error.message}`);
    }
  }
}
