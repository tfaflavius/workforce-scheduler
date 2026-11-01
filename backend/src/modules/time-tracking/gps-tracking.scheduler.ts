import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { PushNotificationService } from '../notifications/push-notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { TimeTrackingService } from './time-tracking.service';

/**
 * GPS Tracking Scheduler (Intretinere Parcari)
 *
 * Verificarea GPS se face DIN ORA IN ORA, DOAR Luni-Vineri intre 07:30 si 15:30:
 * la fiecare ora (07:30, 08:30, ..., 15:30) se trimite un push silent catre angajatii
 * cu tura activa, care declanseaza Service Worker-ul din browser sa capteze locatia GPS
 * si sa o trimita in backend. (Pe mobil, push-ul silent este singura metoda sigura de a
 * obtine GPS cand ecranul e stins.)
 *
 * La 15:30 turele ramase pornite se inchid automat si se calculeaza orele lucrate.
 *
 * Adminii/managerii NU mai primesc notificari per-eveniment (era spam). Toate locatiile +
 * toate erorile de verificare + angajatii sub 8h ajung intr-un SINGUR raport in-app la 16:00.
 *
 * NOTA: raportul GPS pe email ramane in AdminConsolidatedScheduler (raportul de seara, 20:00).
 */
@Injectable()
export class GpsTrackingScheduler {
  private readonly logger = new Logger(GpsTrackingScheduler.name);

  constructor(
    @InjectRepository(TimeEntry)
    private timeEntryRepository: Repository<TimeEntry>,
    private pushNotificationService: PushNotificationService,
    private timeTrackingService: TimeTrackingService,
  ) {}

  // Din ora in ora, Luni-Vineri, intre 07:30 si 15:30 (07:30, 08:30, ... 15:30).
  @Cron('30 7-15 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async triggerGpsCapture() {
    try {
      // Find all active time entries (started but not stopped)
      // Only for departments that need GPS tracking
      // Control exclus intentionat: userii de la Control isi fac pontajul si
      // localizarea GPS printr-o alta aplicatie, deci nu le mai trimitem push-uri
      // de capturare GPS de aici. Doar Intretinere Parcari ramane urmarit activ.
      const activeEntries = await this.timeEntryRepository
        .createQueryBuilder('entry')
        .leftJoinAndSelect('entry.user', 'user')
        .leftJoinAndSelect('user.department', 'department')
        .where('entry.endTime IS NULL')
        .andWhere('department.name IN (:...deptNames)', {
          deptNames: ['Intretinere Parcari'],
        })
        .getMany();

      if (activeEntries.length === 0) {
        return;
      }

      this.logger.log(
        `[GPS Cron] Sending GPS capture push to ${activeEntries.length} active employees`,
      );

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
            NotificationType.GPS_STATUS_ALERT,
          );
        } catch (err) {
          this.logger.debug(
            `[GPS Cron] Failed to send push to ${entry.user?.fullName}: ${err.message}`,
          );
        }
      });

      await Promise.all(sendPromises);
      this.logger.log(`[GPS Cron] Push notifications sent to ${activeEntries.length} employees`);
    } catch (error) {
      this.logger.error(`[GPS Cron] Error: ${error.message}`);
    }
  }

  /**
   * La 15:30 (Luni-Vineri) inchide automat turele ramase pornite si calculeaza orele
   * lucrate. Daca un angajat a iesit sub 8h, este notificat. Fara notificari catre admini.
   */
  @Cron('30 15 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async autoCloseShiftsAtEndOfDay() {
    try {
      const closed = await this.timeTrackingService.autoCloseShiftsAtWindowEnd();
      if (closed > 0) {
        this.logger.log(`[Auto-close 15:30] ${closed} ture inchise automat la sfarsitul zilei`);
      }
    } catch (error) {
      this.logger.error(`[Auto-close 15:30] Error: ${error.message}`);
    }
  }

  /**
   * La 16:00 (Luni-Vineri) trimite UN SINGUR raport in-app consolidat catre admini +
   * manageri: rezumatul locatiilor, toate erorile de verificare GPS si angajatii sub 8h.
   * Inlocuieste notificarile per-eveniment (care erau spam).
   */
  @Cron('0 16 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async sendDailyAdminGpsDigest() {
    try {
      const sent = await this.timeTrackingService.sendDailyAdminDigest(new Date());
      if (sent > 0) {
        this.logger.log(`[Raport 16:00] Raport GPS & pontaj trimis la ${sent} admini/manageri`);
      }
    } catch (error) {
      this.logger.error(`[Raport 16:00] Error: ${error.message}`);
    }
  }
}
