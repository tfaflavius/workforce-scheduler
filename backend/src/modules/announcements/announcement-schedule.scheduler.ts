import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../notifications/entities/notification.entity';
import { AnnouncementsService } from './announcements.service';

/**
 * Trimite anuntul pontaj + amenzi (in-app + email) O SINGURA DATA, la data tinta,
 * la 07:30 Europe/Bucharest. Dupa ce data tinta trece, cron-ul nu mai face nimic.
 * Idempotent: daca anuntul a fost deja trimis in ziua tinta (marker in notificari),
 * nu il retrimite (rezista la restart-uri).
 */
@Injectable()
export class AnnouncementScheduleScheduler {
  private readonly logger = new Logger(AnnouncementScheduleScheduler.name);

  // Data la care trebuie trimis (maine, ora 07:30 Europe/Bucharest).
  private readonly TARGET_DATE = '2026-08-05';

  constructor(
    private readonly announcementsService: AnnouncementsService,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  @Cron('30 7 * * *', {
    name: 'pontaj-amenzi-scheduled',
    timeZone: 'Europe/Bucharest',
  })
  async handle(): Promise<void> {
    const todayBucharest = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Europe/Bucharest',
    }); // format YYYY-MM-DD

    if (todayBucharest !== this.TARGET_DATE) {
      return; // nu e ziua tinta
    }

    // Idempotency: daca deja s-a trimis in ziua tinta, nu retrimite
    const alreadySent = await this.notificationRepo
      .createQueryBuilder('n')
      .where(`n.data->>'announcementKey' = :key`, { key: 'pontaj-amenzi' })
      .andWhere('n.created_at >= :start', { start: `${this.TARGET_DATE}T00:00:00` })
      .getCount();

    if (alreadySent > 0) {
      this.logger.log('Anuntul pontaj/amenzi a fost deja trimis azi — skip.');
      return;
    }

    this.logger.log('Trimit anuntul programat pontaj + amenzi (07:30).');
    try {
      const res = await this.announcementsService.sendPontajAmenziAnnouncement();
      this.logger.log(
        `Anunt programat trimis: ${res.notified} notificari, ${res.emailed} emailuri (${res.failed} esuate).`,
      );
    } catch (err: any) {
      this.logger.error(`Anuntul programat a esuat: ${err?.message}`, err?.stack);
    }
  }
}
