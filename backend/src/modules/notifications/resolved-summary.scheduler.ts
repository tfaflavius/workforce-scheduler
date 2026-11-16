import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Not, Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../../common/email/email.service';
import { NotificationsService, RESOLVED_NOTIFICATION_TYPES } from './notifications.service';

/** Ce NU intra in rezumat: mesajele de chat, activitatea echipei si rezumatele insele. */
const SUMMARY_EXCLUDED_TYPES: NotificationType[] = [
  NotificationType.CHAT_MESSAGE,
  NotificationType.HOLIDAY_CHAT_MESSAGE,
  NotificationType.TEAM_ACTIVITY,
  NotificationType.DAILY_DIGEST,
  NotificationType.DAILY_SUMMARY,
  NotificationType.GENERAL,
  NotificationType.ACCOUNT_UPDATED,
];

type Section = 'new' | 'resolved' | 'leave' | 'swap' | 'edit' | 'schedule' | 'reports' | 'other';

const SECTION_TITLES: Record<Section, string> = {
  new: 'Probleme si solicitari noi / alocate',
  resolved: 'Rezolvate / finalizate',
  leave: 'Concedii',
  swap: 'Schimburi de tura',
  edit: 'Cereri de editare',
  schedule: 'Programe de lucru',
  reports: 'Rapoarte zilnice',
  other: 'Alte alerte',
};
const SECTION_ORDER: Section[] = [
  'new',
  'resolved',
  'leave',
  'swap',
  'edit',
  'schedule',
  'reports',
  'other',
];

const sectionOf = (type: NotificationType): Section => {
  if (RESOLVED_NOTIFICATION_TYPES.includes(type)) return 'resolved';
  if (type.startsWith('LEAVE_')) return 'leave';
  if (type.startsWith('SHIFT_SWAP_')) return 'swap';
  if (type.startsWith('EDIT_REQUEST_')) return 'edit';
  if (type.startsWith('SCHEDULE_') || type === NotificationType.SHIFT_REMINDER) return 'schedule';
  if (type.startsWith('DAILY_REPORT_')) return 'reports';
  if (
    type.endsWith('_ASSIGNED') ||
    type.startsWith('PV_SESSION_') ||
    type.startsWith('DOMICILIU_')
  ) {
    return 'new';
  }
  return 'other';
};

/** Solicitarile = concedii + schimburi de tura + cereri de editare + cereri de program. */
const isRequest = (s: Section) => s === 'leave' || s === 'swap' || s === 'edit' || s === 'schedule';

/**
 * Rezumatul zilei, la 20:00 (ora Romaniei), in fiecare zi:
 * - email cu tot ce s-a intamplat azi (probleme create/alocate, rezolvate, solicitari, finalizari)
 * - notificare push (si in aplicatie) cu numerele pe scurt.
 * Pe parcursul zilei fiecare eveniment vine doar ca notificare push, fara email.
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
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 20 * * *', { timeZone: 'Europe/Bucharest' })
  async handleEveningSummary(): Promise<void> {
    try {
      const { emails, pushes } = await this.sendSummary(new Date());
      this.logger.log(`[Rezumat 20:00] Email: ${emails}, push: ${pushes}`);
    } catch (err) {
      this.logger.error(`[Rezumat 20:00] Eroare: ${err?.message}`);
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

  async sendSummary(now: Date): Promise<{ emails: number; pushes: number }> {
    const from = this.bucharestDayStart(now);
    const rows = await this.notificationRepo.find({
      where: { type: Not(In(SUMMARY_EXCLUDED_TYPES)), createdAt: Between(from, now) },
      order: { createdAt: 'ASC' },
    });
    if (rows.length === 0) return { emails: 0, pushes: 0 };

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
    const timeOf = (d: Date) =>
      new Date(d).toLocaleTimeString('ro-RO', {
        timeZone: 'Europe/Bucharest',
        hour: '2-digit',
        minute: '2-digit',
      });

    let emails = 0;
    let pushes = 0;
    for (const u of users) {
      const list = byUser.get(u.id)!;
      const grouped = new Map<Section, string[]>();
      for (const n of list) {
        const sec = sectionOf(n.type);
        if (!grouped.has(sec)) grouped.set(sec, []);
        grouped.get(sec)!.push(`${timeOf(n.createdAt)} - ${n.title}: ${n.message}`);
      }
      const sections = SECTION_ORDER.filter((s) => grouped.has(s)).map((s) => ({
        title: SECTION_TITLES[s],
        items: grouped.get(s)!,
      }));
      if (sections.length === 0) continue;

      const count = (s: Section) => grouped.get(s)?.length ?? 0;
      const requests = SECTION_ORDER.filter(isRequest).reduce((n, s) => n + count(s), 0);
      const parts = [
        count('new') ? `${count('new')} noi/alocate` : '',
        count('resolved') ? `${count('resolved')} rezolvate` : '',
        requests ? `${requests} solicitari` : '',
        count('reports') + count('other') ? `${count('reports') + count('other')} alte` : '',
      ].filter(Boolean);

      // 1) Push (si in aplicatie) - fara email separat, emailul e mai jos
      try {
        await this.notificationsService.create({
          userId: u.id,
          type: NotificationType.DAILY_SUMMARY,
          title: `Rezumatul zilei - ${dateLabel}`,
          message: `Azi: ${parts.join(', ')}.${u.email ? ' Detaliile complete sunt pe email.' : ''}`,
          data: { url: '/notifications' },
          skipEmail: true,
        });
        pushes++;
      } catch (err) {
        this.logger.warn(`[Rezumat 20:00] Push esuat pentru ${u.id}: ${err?.message}`);
      }

      // 2) Emailul cu toate detaliile
      if (!u.email) continue;
      const ok = await this.emailService
        .sendResolvedSummaryEmail({
          recipientEmail: u.email,
          recipientName: u.fullName || u.email,
          dateLabel,
          sections,
        })
        .catch((err) => {
          this.logger.warn(`[Rezumat 20:00] Email esuat pentru ${u.email}: ${err?.message}`);
          return false;
        });
      if (ok) emails++;
    }
    return { emails, pushes };
  }
}
