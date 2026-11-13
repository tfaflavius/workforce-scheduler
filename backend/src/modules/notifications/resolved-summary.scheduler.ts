import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../../common/email/email.service';
import { RESOLVED_NOTIFICATION_TYPES } from './notifications.service';

const SECTION_TITLES: Partial<Record<NotificationType, string>> = {
  [NotificationType.PARKING_ISSUE_RESOLVED]: 'Probleme parcari rezolvate',
  [NotificationType.PARKING_DAMAGE_RESOLVED]: 'Prejudicii rezolvate',
  [NotificationType.HANDICAP_REQUEST_RESOLVED]: 'Solicitari Handicap finalizate',
  [NotificationType.DOMICILIU_REQUEST_RESOLVED]: 'Solicitari Domiciliu finalizate',
  [NotificationType.LEGITIMATION_RESOLVED]: 'Legitimatii finalizate',
  [NotificationType.CONTROL_SESIZARE_RESOLVED]: 'Sesizari Control rezolvate',
};

/**
 * In aplicatie (in-app + push) problemele finalizate se anunta imediat; pe email vine
 * O SINGURA data, seara la 20:00, cu tot ce s-a finalizat in ziua respectiva.
 */
@Injectable()
export class ResolvedSummaryScheduler {
  private readonly logger = new Logger(ResolvedSummaryScheduler.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 20 * * *', { timeZone: 'Europe/Bucharest' })
  async handleEveningSummary(): Promise<void> {
    try {
      const sent = await this.sendSummary(new Date());
      this.logger.log(`[Finalizate 20:00] Email trimis la ${sent} persoane`);
    } catch (err) {
      this.logger.error(`[Finalizate 20:00] Eroare: ${err?.message}`);
    }
  }

  /** Inceputul zilei (Europe/Bucharest) pentru data data, ca moment UTC. */
  private bucharestDayStart(now: Date): Date {
    const ymd = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
    const noonUtc = new Date(`${ymd}T12:00:00Z`);
    const hourThere = Number(
      noonUtc.toLocaleString('en-GB', {
        timeZone: 'Europe/Bucharest',
        hour: '2-digit',
        hour12: false,
      }),
    );
    const offsetH = hourThere - 12;
    return new Date(new Date(`${ymd}T00:00:00Z`).getTime() - offsetH * 3600 * 1000);
  }

  async sendSummary(now: Date): Promise<number> {
    const from = this.bucharestDayStart(now);
    const rows = await this.notificationRepo.find({
      where: { type: In(RESOLVED_NOTIFICATION_TYPES), createdAt: Between(from, now) },
      order: { createdAt: 'ASC' },
    });
    if (rows.length === 0) return 0;

    const byUser = new Map<string, Notification[]>();
    for (const n of rows) {
      if (!byUser.has(n.userId)) byUser.set(n.userId, []);
      byUser.get(n.userId)!.push(n);
    }
    const users = await this.userRepo.find({
      where: { id: In([...byUser.keys()]), isActive: true },
      select: ['id', 'email', 'fullName'],
    });
    const dateLabel = now.toLocaleDateString('ro-RO', {
      timeZone: 'Europe/Bucharest',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let sent = 0;
    for (const u of users) {
      if (!u.email) continue;
      const list = byUser.get(u.id)!;
      const sections: Array<{ title: string; items: string[] }> = [];
      for (const type of RESOLVED_NOTIFICATION_TYPES) {
        const items = list
          .filter((n) => n.type === type)
          .map((n) => {
            const time = new Date(n.createdAt).toLocaleTimeString('ro-RO', {
              timeZone: 'Europe/Bucharest',
              hour: '2-digit',
              minute: '2-digit',
            });
            return `${time} - ${n.message}`;
          });
        if (items.length) sections.push({ title: SECTION_TITLES[type] || type, items });
      }
      if (sections.length === 0) continue;
      const ok = await this.emailService
        .sendResolvedSummaryEmail({
          recipientEmail: u.email,
          recipientName: u.fullName || u.email,
          dateLabel,
          sections,
        })
        .catch((err) => {
          this.logger.warn(`[Finalizate 20:00] Email esuat pentru ${u.email}: ${err?.message}`);
          return false;
        });
      if (ok) sent++;
    }
    return sent;
  }
}
