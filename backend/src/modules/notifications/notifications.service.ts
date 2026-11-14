import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationSettingCheckService } from './notification-setting-check.service';
import { PushNotificationService } from './push-notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { formatMonthYear } from '../../common/utils/romanian-months';
import { EmailService } from '../../common/email/email.service';

// URL mapping per notification type - used for push notification click navigation
const NOTIFICATION_URL_MAP: Partial<Record<NotificationType, string>> = {
  [NotificationType.SCHEDULE_CREATED]: '/schedules',
  [NotificationType.SCHEDULE_UPDATED]: '/schedules',
  [NotificationType.SCHEDULE_APPROVED]: '/schedules',
  [NotificationType.SCHEDULE_REJECTED]: '/schedules',
  [NotificationType.SHIFT_REMINDER]: '/my-schedule',
  [NotificationType.EMPLOYEE_ABSENT]: '/schedules',
  [NotificationType.PARKING_ISSUE_ASSIGNED]: '/parking',
  [NotificationType.PARKING_ISSUE_RESOLVED]: '/parking',
  [NotificationType.PARKING_DAMAGE_ASSIGNED]: '/parking',
  [NotificationType.PARKING_DAMAGE_RESOLVED]: '/parking',
  [NotificationType.HANDICAP_REQUEST_ASSIGNED]: '/parking/handicap',
  [NotificationType.HANDICAP_REQUEST_RESOLVED]: '/parking/handicap',
  [NotificationType.DOMICILIU_REQUEST_ASSIGNED]: '/parking/domiciliu',
  [NotificationType.DOMICILIU_REQUEST_RESOLVED]: '/parking/domiciliu',
  [NotificationType.DOMICILIU_REQUEST_DEADLINE_APPROACHING]: '/parking/domiciliu',
  [NotificationType.DOMICILIU_SIGN_PLACEMENT]: '/parking/domiciliu',
  [NotificationType.LEGITIMATION_ASSIGNED]: '/parking/handicap',
  [NotificationType.LEGITIMATION_RESOLVED]: '/parking/handicap',
  [NotificationType.SHIFT_SWAP_REQUEST]: '/shift-swaps',
  [NotificationType.SHIFT_SWAP_RESPONSE]: '/shift-swaps',
  [NotificationType.SHIFT_SWAP_ACCEPTED]: '/shift-swaps',
  [NotificationType.SHIFT_SWAP_APPROVED]: '/shift-swaps',
  [NotificationType.SHIFT_SWAP_REJECTED]: '/shift-swaps',
  [NotificationType.LEAVE_REQUEST_CREATED]: '/leave-requests',
  [NotificationType.LEAVE_REQUEST_APPROVED]: '/leave-requests',
  [NotificationType.LEAVE_REQUEST_REJECTED]: '/leave-requests',
  [NotificationType.DAILY_REPORT_SUBMITTED]: '/daily-reports',
  [NotificationType.DAILY_REPORT_COMMENTED]: '/daily-reports',
  [NotificationType.DAILY_REPORT_MISSING]: '/daily-reports',
  [NotificationType.ACCOUNT_UPDATED]: '/profile',
  [NotificationType.TEAM_ACTIVITY]: '/notifications',
  [NotificationType.EDIT_REQUEST_CREATED]: '/admin/edit-requests',
  [NotificationType.EDIT_REQUEST_APPROVED]: '/admin/edit-requests',
  [NotificationType.EDIT_REQUEST_REJECTED]: '/admin/edit-requests',
  [NotificationType.PV_SESSION_ASSIGNED]: '/procese-verbale',
  [NotificationType.PV_SESSION_UPDATED]: '/procese-verbale',
  [NotificationType.CONTROL_SESIZARE_ASSIGNED]: '/control-sesizari',
  [NotificationType.CONTROL_SESIZARE_RESOLVED]: '/control-sesizari',
  [NotificationType.LEAVE_OVERLAP_WARNING]: '/leave-requests',
  [NotificationType.DAILY_DIGEST]: '/notifications',
  [NotificationType.HOLIDAY_CHAT_MESSAGE]: '/sarbatori',
  [NotificationType.CHAT_MESSAGE]: '/chat',
};

/**
 * Tipuri de notificari pentru care NU se trimite emailul automat:
 * - au deja email dedicat (schimburi tura, concedii, cereri editare, programe, anunturi)
 *   -> altfel ar veni doua emailuri pentru acelasi eveniment;
 * - rapoartele zilnice raman exact cum erau;
 * - GPS / pontaj ajung doar in rezumatul zilnic de la 08:00 (admin + manager).
 */
/** Problemele finalizate: un singur email seara la 20:00 (ResolvedSummaryScheduler). */
export const RESOLVED_NOTIFICATION_TYPES: NotificationType[] = [
  NotificationType.PARKING_ISSUE_RESOLVED,
  NotificationType.PARKING_DAMAGE_RESOLVED,
  NotificationType.HANDICAP_REQUEST_RESOLVED,
  NotificationType.DOMICILIU_REQUEST_RESOLVED,
  NotificationType.LEGITIMATION_RESOLVED,
  NotificationType.CONTROL_SESIZARE_RESOLVED,
];

const EMAIL_EXCLUDED_TYPES = new Set<NotificationType>([
  NotificationType.SHIFT_SWAP_REQUEST,
  NotificationType.SHIFT_SWAP_RESPONSE,
  NotificationType.SHIFT_SWAP_ACCEPTED,
  NotificationType.SHIFT_SWAP_APPROVED,
  NotificationType.SHIFT_SWAP_REJECTED,
  NotificationType.LEAVE_REQUEST_CREATED,
  NotificationType.LEAVE_REQUEST_APPROVED,
  NotificationType.LEAVE_REQUEST_REJECTED,
  NotificationType.EDIT_REQUEST_CREATED,
  NotificationType.EDIT_REQUEST_APPROVED,
  NotificationType.EDIT_REQUEST_REJECTED,
  NotificationType.SCHEDULE_CREATED,
  NotificationType.SCHEDULE_UPDATED,
  NotificationType.SCHEDULE_APPROVED,
  NotificationType.SCHEDULE_REJECTED,
  NotificationType.GENERAL,
  NotificationType.DAILY_REPORT_SUBMITTED,
  NotificationType.DAILY_REPORT_COMMENTED,
  NotificationType.DAILY_REPORT_MISSING,
  NotificationType.GPS_STATUS_ALERT,
  NotificationType.TIME_ENTRY_MISMATCH,
  // Chat sarbatori: doar in-app + push, fara email (ar fi prea multe)
  NotificationType.HOLIDAY_CHAT_MESSAGE,
  NotificationType.CHAT_MESSAGE,
  // Activitatea echipei: doar in-app + push (ar fi prea multe emailuri)
  NotificationType.TEAM_ACTIVITY,
  // Problemele finalizate: in-app + push imediat, emailul vine centralizat la 20:00
  ...RESOLVED_NOTIFICATION_TYPES,
]);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private settingCheck: NotificationSettingCheckService,
    private pushNotificationService: PushNotificationService,
    private emailService: EmailService,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification | null> {
    // Check if in-app notification is enabled for this user's role
    try {
      const user = await this.userRepository.findOne({
        where: { id: createNotificationDto.userId },
        select: ['id', 'role'],
      });

      if (user) {
        const enabled = await this.settingCheck.isInAppEnabled(
          createNotificationDto.type,
          user.role,
        );
        if (!enabled) {
          this.logger.debug(
            `In-app notification ${createNotificationDto.type} suppressed for role ${user.role}`,
          );
          // Even if in-app is suppressed, still try push (separate setting)
          if (!createNotificationDto.skipPush) {
            this.sendPushForNotification(createNotificationDto).catch((err) => {
              this.logger.warn(`Failed to auto-send push: ${err?.message}`);
            });
          }
          return null;
        }
      }
    } catch (error) {
      // If check fails, proceed with sending (safe fallback)
      this.logger.warn(`Failed to check notification setting, proceeding: ${error}`);
    }

    const notification = this.notificationRepository.create(createNotificationDto);
    const saved = await this.notificationRepository.save(notification);
    this.logger.log(
      `Created notification for user ${createNotificationDto.userId}: ${createNotificationDto.title}`,
    );

    // Auto-send push notification (unless explicitly skipped) — pass saved ID for deep linking
    if (!createNotificationDto.skipPush) {
      this.sendPushForNotification(createNotificationDto, saved.id).catch((err) => {
        this.logger.warn(`Failed to auto-send push: ${err?.message}`);
      });
    }

    this.sendEmailsForNotifications([createNotificationDto]);

    return saved;
  }

  async createMany(notifications: CreateNotificationDto[]): Promise<Notification[]> {
    // Batch check: get unique userIds, fetch roles, filter
    try {
      const userIds = [...new Set(notifications.map((n) => n.userId))];
      const users = await this.userRepository.find({
        where: { id: In(userIds) },
        select: ['id', 'role'],
      });
      const roleMap = new Map(users.map((u) => [u.id, u.role]));

      const filtered: CreateNotificationDto[] = [];
      const pushCandidates: CreateNotificationDto[] = [];

      for (const dto of notifications) {
        const role = roleMap.get(dto.userId);
        if (!role) {
          filtered.push(dto); // fallback: send anyway if user not found
          if (!dto.skipPush) pushCandidates.push(dto);
          continue;
        }
        const enabled = await this.settingCheck.isInAppEnabled(dto.type, role);
        if (enabled) {
          filtered.push(dto);
        } else {
          this.logger.debug(`In-app notification ${dto.type} suppressed for role ${role}`);
        }
        // Push is a separate setting — always add to candidates if not skipped
        if (!dto.skipPush) {
          pushCandidates.push(dto);
        }
      }

      // Save in-app notifications
      let saved: Notification[] = [];
      if (filtered.length > 0) {
        const entities = filtered.map((dto) => this.notificationRepository.create(dto));
        saved = await this.notificationRepository.save(entities);
      }

      this.sendEmailsForNotifications(filtered);

      const suppressed = notifications.length - filtered.length;
      if (suppressed > 0) {
        this.logger.log(
          `Created ${saved.length} notifications (${suppressed} suppressed by settings)`,
        );
      } else {
        this.logger.log(`Created ${saved.length} notifications`);
      }

      // Auto-send push notifications (fire-and-forget) — map saved IDs for deep linking
      if (pushCandidates.length > 0) {
        // Build map from composite key to saved notification ID
        const savedMap = new Map<string, string>();
        for (const s of saved) {
          savedMap.set(`${s.userId}:${s.type}:${s.title}`, s.id);
        }

        Promise.all(
          pushCandidates.map((dto) => {
            const key = `${dto.userId}:${dto.type}:${dto.title}`;
            const savedId = savedMap.get(key);
            return this.sendPushForNotification(dto, savedId).catch((err) => {
              this.logger.warn(`Failed to auto-send push: ${err?.message}`);
            });
          }),
        ).catch(() => {});
      }

      return saved;
    } catch (error) {
      // If check fails, proceed with sending all (safe fallback)
      this.logger.warn(`Failed to check notification settings, sending all: ${error}`);
      const entities = notifications.map((dto) => this.notificationRepository.create(dto));
      const saved = await this.notificationRepository.save(entities);
      this.logger.log(`Created ${saved.length} notifications`);

      // Build map from composite key to saved notification ID
      const savedMap = new Map<string, string>();
      for (const s of saved) {
        savedMap.set(`${s.userId}:${s.type}:${s.title}`, s.id);
      }

      this.sendEmailsForNotifications(notifications);

      // Still try push for non-skipped
      const pushCandidates = notifications.filter((dto) => !dto.skipPush);
      if (pushCandidates.length > 0) {
        Promise.all(
          pushCandidates.map((dto) => {
            const key = `${dto.userId}:${dto.type}:${dto.title}`;
            const savedId = savedMap.get(key);
            return this.sendPushForNotification(dto, savedId).catch((err) => {
              this.logger.warn(`Failed to auto-send push: ${err?.message}`);
            });
          }),
        ).catch(() => {});
      }

      return saved;
    }
  }

  async findAllForUser(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number },
  ): Promise<Notification[]> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (options?.unreadOnly) {
      query.andWhere('notification.isRead = false');
    }

    // Apply limit (default max 200 to prevent unbounded queries)
    query.take(options?.limit ?? 200);

    return query.getMany();
  }

  async findOneById(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException(`Notificarea ${id} nu a fost gasita`);
    }
    return notification;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    await this.notificationRepository.update({ id, userId }, { isRead: true, readAt: new Date() });
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notificarea ${id} nu a fost gasita`);
    }
    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    this.logger.log(`Marked all notifications as read for user ${userId}`);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.notificationRepository.delete({ id, userId });
  }

  async deleteAllRead(userId: string): Promise<void> {
    await this.notificationRepository.delete({ userId, isRead: true });
    this.logger.log(`Deleted all read notifications for user ${userId}`);
  }

  // Helper methods for creating specific notification types
  async notifyScheduleApproved(
    userId: string,
    monthYear: string,
    approverName: string,
    scheduleId?: string,
  ): Promise<Notification | null> {
    const formatted = formatMonthYear(monthYear);

    return this.create({
      userId,
      type: NotificationType.SCHEDULE_APPROVED,
      title: 'Program aprobat',
      message: `Programul tau pentru ${formatted} a fost aprobat de ${approverName}.`,
      data: { monthYear, approverName, scheduleId },
    });
  }

  async notifyScheduleRejected(
    userId: string,
    monthYear: string,
    reason: string,
    rejectorName: string,
    scheduleId?: string,
  ): Promise<Notification | null> {
    const formatted = formatMonthYear(monthYear);

    return this.create({
      userId,
      type: NotificationType.SCHEDULE_REJECTED,
      title: 'Program respins',
      message: `Programul pentru ${formatted} a fost respins. Motiv: ${reason}`,
      data: { monthYear, reason, rejectorName, scheduleId },
    });
  }

  async notifyScheduleCreated(
    userIds: string[],
    monthYear: string,
    creatorName: string,
    scheduleId?: string,
  ): Promise<Notification[]> {
    const formatted = formatMonthYear(monthYear);

    const notifications = userIds.map((userId) => ({
      userId,
      type: NotificationType.SCHEDULE_CREATED,
      title: 'Program nou creat',
      message: `A fost creat un program nou pentru ${formatted} de catre ${creatorName}.`,
      data: { monthYear, creatorName, scheduleId },
    }));

    return this.createMany(notifications);
  }

  async notifyScheduleUpdated(
    userIds: string[],
    monthYear: string,
    updaterName: string,
    scheduleId?: string,
  ): Promise<Notification[]> {
    const formatted = formatMonthYear(monthYear);

    const notifications = userIds.map((userId) => ({
      userId,
      type: NotificationType.SCHEDULE_UPDATED,
      title: 'Program actualizat',
      message: `Programul pentru ${formatted} a fost actualizat de ${updaterName}.`,
      data: { monthYear, updaterName, scheduleId },
    }));

    return this.createMany(notifications);
  }

  async notifyShiftReminder(
    userId: string,
    shiftDate: string,
    shiftTime: string,
    shiftType: string,
  ): Promise<Notification | null> {
    return this.create({
      userId,
      type: NotificationType.SHIFT_REMINDER,
      title: 'Reminder tura',
      message: `Tura ta ${shiftType} incepe in curand (${shiftTime}).`,
      data: { shiftDate, shiftTime, shiftType },
    });
  }

  // ============== EMAIL HELPERS ==============

  /**
   * Trimite cate un email pentru fiecare notificare noua (fire-and-forget).
   * Emailurile sunt puse in coada in EmailService, deci nu blocheaza raspunsul.
   */
  private sendEmailsForNotifications(dtos: CreateNotificationDto[]): void {
    const eligible = dtos.filter((d) => !d.skipEmail && !EMAIL_EXCLUDED_TYPES.has(d.type));
    if (eligible.length === 0) return;

    (async () => {
      const userIds = [...new Set(eligible.map((d) => d.userId))];
      const users = await this.userRepository.find({
        where: { id: In(userIds), isActive: true },
        select: ['id', 'email', 'fullName'],
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      for (const dto of eligible) {
        const user = userMap.get(dto.userId);
        if (!user?.email) continue;
        await this.emailService
          .sendNotificationEmail({
            recipientEmail: user.email,
            recipientName: user.fullName || user.email,
            title: dto.title,
            message: dto.message,
          })
          .catch((err) => this.logger.warn(`Failed to send notification email: ${err?.message}`));
      }
    })().catch((err) => this.logger.warn(`Failed to prepare notification emails: ${err?.message}`));
  }

  /** Anunt general catre toti utilizatorii activi: in aplicatie, push si email. */
  async broadcast(
    title: string,
    message: string,
    senderId: string,
    url?: string,
  ): Promise<{ sent: number }> {
    const users = await this.userRepository.find({
      where: { isActive: true },
      select: ['id', 'email', 'fullName'],
    });
    if (users.length === 0) return { sent: 0 };
    await this.createMany(
      users.map((u) => ({
        userId: u.id,
        type: NotificationType.GENERAL,
        title: title.trim(),
        message: message.trim(),
        data: { broadcast: true, senderId, ...(url ? { url } : {}) },
      })),
    );
    // GENERAL nu trimite email automat, asa ca anuntul isi trimite singur emailurile
    (async () => {
      let ok = 0;
      for (const u of users) {
        if (!u.email) continue;
        const sent = await this.emailService
          .sendNotificationEmail({
            recipientEmail: u.email,
            recipientName: u.fullName || u.email,
            title: title.trim(),
            message: message.trim(),
          })
          .catch((err) => {
            this.logger.warn(`[Anunt] Email esuat pentru ${u.email}: ${err?.message}`);
            return false;
          });
        if (sent) ok++;
      }
      this.logger.log(`[Anunt] Emailuri trimise: ${ok}/${users.length}`);
    })().catch((err) => this.logger.warn(`[Anunt] Eroare emailuri: ${err?.message}`));
    this.logger.log(`[Anunt] "${title}" trimis la ${users.length} utilizatori`);
    return { sent: users.length };
  }

  // ============== PUSH NOTIFICATION HELPERS ==============

  private async sendPushForNotification(
    dto: CreateNotificationDto,
    notificationId?: string,
  ): Promise<void> {
    // If we have a saved notification ID, use the redirect page for deep linking
    // Otherwise fall back to generic page URL
    const url = notificationId
      ? `/notification-redirect/${notificationId}`
      : NOTIFICATION_URL_MAP[dto.type] || '/notifications';
    await this.pushNotificationService.sendToUser(
      dto.userId,
      dto.title,
      dto.message,
      { ...dto.data, url },
      dto.type,
    );
  }
}
