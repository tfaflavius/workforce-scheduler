import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationSettingCheckService } from './notification-setting-check.service';
import { PushNotificationService } from './push-notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { formatMonthYear } from '../../common/utils/romanian-months';

// URL mapping per notification type - used for push notification click navigation
const NOTIFICATION_URL_MAP: Partial<Record<NotificationType, string>> = {
  [NotificationType.SCHEDULE_CREATED]: '/schedules',
  [NotificationType.SCHEDULE_UPDATED]: '/schedules',
  [NotificationType.SCHEDULE_APPROVED]: '/schedules',
  [NotificationType.SCHEDULE_REJECTED]: '/schedules',
  [NotificationType.SHIFT_REMINDER]: '/my-schedule',
  [NotificationType.EMPLOYEE_ABSENT]: '/admin/time-tracking',
  [NotificationType.PARKING_ISSUE_ASSIGNED]: '/parking',
  [NotificationType.PARKING_ISSUE_RESOLVED]: '/parking',
  [NotificationType.PARKING_DAMAGE_ASSIGNED]: '/parking-damages',
  [NotificationType.PARKING_DAMAGE_RESOLVED]: '/parking-damages',
  [NotificationType.HANDICAP_REQUEST_ASSIGNED]: '/handicap-parking',
  [NotificationType.HANDICAP_REQUEST_RESOLVED]: '/handicap-parking',
  [NotificationType.DOMICILIU_REQUEST_ASSIGNED]: '/domiciliu-parking',
  [NotificationType.DOMICILIU_REQUEST_RESOLVED]: '/domiciliu-parking',
  [NotificationType.LEGITIMATION_ASSIGNED]: '/handicap-parking',
  [NotificationType.LEGITIMATION_RESOLVED]: '/handicap-parking',
  [NotificationType.EDIT_REQUEST_CREATED]: '/admin/edit-requests',
  [NotificationType.EDIT_REQUEST_APPROVED]: '/admin/edit-requests',
  [NotificationType.EDIT_REQUEST_REJECTED]: '/admin/edit-requests',
  [NotificationType.PV_SESSION_ASSIGNED]: '/pv-display',
  [NotificationType.PV_SESSION_UPDATED]: '/pv-display',
  [NotificationType.CONTROL_SESIZARE_ASSIGNED]: '/control-sesizari',
  [NotificationType.CONTROL_SESIZARE_RESOLVED]: '/control-sesizari',
  [NotificationType.LEAVE_OVERLAP_WARNING]: '/leave-requests',
};

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
            this.sendPushForNotification(createNotificationDto).catch(err => {
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
    this.logger.log(`Created notification for user ${createNotificationDto.userId}: ${createNotificationDto.title}`);

    // Auto-send push notification (unless explicitly skipped)
    if (!createNotificationDto.skipPush) {
      this.sendPushForNotification(createNotificationDto).catch(err => {
        this.logger.warn(`Failed to auto-send push: ${err?.message}`);
      });
    }

    return saved;
  }

  async createMany(notifications: CreateNotificationDto[]): Promise<Notification[]> {
    // Batch check: get unique userIds, fetch roles, filter
    try {
      const userIds = [...new Set(notifications.map(n => n.userId))];
      const users = await this.userRepository.find({
        where: { id: In(userIds) },
        select: ['id', 'role'],
      });
      const roleMap = new Map(users.map(u => [u.id, u.role]));

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
        const entities = filtered.map(dto => this.notificationRepository.create(dto));
        saved = await this.notificationRepository.save(entities);
      }

      const suppressed = notifications.length - filtered.length;
      if (suppressed > 0) {
        this.logger.log(`Created ${saved.length} notifications (${suppressed} suppressed by settings)`);
      } else {
        this.logger.log(`Created ${saved.length} notifications`);
      }

      // Auto-send push notifications (fire-and-forget)
      if (pushCandidates.length > 0) {
        Promise.all(
          pushCandidates.map(dto =>
            this.sendPushForNotification(dto).catch(err => {
              this.logger.warn(`Failed to auto-send push: ${err?.message}`);
            }),
          ),
        ).catch(() => {});
      }

      return saved;
    } catch (error) {
      // If check fails, proceed with sending all (safe fallback)
      this.logger.warn(`Failed to check notification settings, sending all: ${error}`);
      const entities = notifications.map(dto => this.notificationRepository.create(dto));
      const saved = await this.notificationRepository.save(entities);
      this.logger.log(`Created ${saved.length} notifications`);

      // Still try push for non-skipped
      const pushCandidates = notifications.filter(dto => !dto.skipPush);
      if (pushCandidates.length > 0) {
        Promise.all(
          pushCandidates.map(dto =>
            this.sendPushForNotification(dto).catch(err => {
              this.logger.warn(`Failed to auto-send push: ${err?.message}`);
            }),
          ),
        ).catch(() => {});
      }

      return saved;
    }
  }

  async findAllForUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (options?.unreadOnly) {
      query.andWhere('notification.isRead = false');
    }

    if (options?.limit) {
      query.take(options.limit);
    }

    return query.getMany();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    await this.notificationRepository.update(
      { id, userId },
      { isRead: true, readAt: new Date() },
    );
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
  ): Promise<Notification | null> {
    const formatted = formatMonthYear(monthYear);

    return this.create({
      userId,
      type: NotificationType.SCHEDULE_APPROVED,
      title: 'Program aprobat',
      message: `Programul tau pentru ${formatted} a fost aprobat de ${approverName}.`,
      data: { monthYear, approverName },
    });
  }

  async notifyScheduleRejected(
    userId: string,
    monthYear: string,
    reason: string,
    rejectorName: string,
  ): Promise<Notification | null> {
    const formatted = formatMonthYear(monthYear);

    return this.create({
      userId,
      type: NotificationType.SCHEDULE_REJECTED,
      title: 'Program respins',
      message: `Programul pentru ${formatted} a fost respins. Motiv: ${reason}`,
      data: { monthYear, reason, rejectorName },
    });
  }

  async notifyScheduleCreated(
    userIds: string[],
    monthYear: string,
    creatorName: string,
  ): Promise<Notification[]> {
    const formatted = formatMonthYear(monthYear);

    const notifications = userIds.map(userId => ({
      userId,
      type: NotificationType.SCHEDULE_CREATED,
      title: 'Program nou creat',
      message: `A fost creat un program nou pentru ${formatted} de catre ${creatorName}.`,
      data: { monthYear, creatorName },
    }));

    return this.createMany(notifications);
  }

  async notifyScheduleUpdated(
    userIds: string[],
    monthYear: string,
    updaterName: string,
  ): Promise<Notification[]> {
    const formatted = formatMonthYear(monthYear);

    const notifications = userIds.map(userId => ({
      userId,
      type: NotificationType.SCHEDULE_UPDATED,
      title: 'Program actualizat',
      message: `Programul pentru ${formatted} a fost actualizat de ${updaterName}.`,
      data: { monthYear, updaterName },
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

  // ============== PUSH NOTIFICATION HELPERS ==============

  private async sendPushForNotification(dto: CreateNotificationDto): Promise<void> {
    const url = NOTIFICATION_URL_MAP[dto.type] || '/notifications';
    await this.pushNotificationService.sendToUser(
      dto.userId,
      dto.title,
      dto.message,
      { ...dto.data, url },
      dto.type,
    );
  }
}
