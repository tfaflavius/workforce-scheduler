import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationSettingCheckService } from './notification-setting-check.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private settingCheck: NotificationSettingCheckService,
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
      for (const dto of notifications) {
        const role = roleMap.get(dto.userId);
        if (!role) {
          filtered.push(dto); // fallback: send anyway if user not found
          continue;
        }
        const enabled = await this.settingCheck.isInAppEnabled(dto.type, role);
        if (enabled) {
          filtered.push(dto);
        } else {
          this.logger.debug(`In-app notification ${dto.type} suppressed for role ${role}`);
        }
      }

      if (filtered.length === 0) return [];

      const entities = filtered.map(dto => this.notificationRepository.create(dto));
      const saved = await this.notificationRepository.save(entities);
      const suppressed = notifications.length - filtered.length;
      if (suppressed > 0) {
        this.logger.log(`Created ${saved.length} notifications (${suppressed} suppressed by settings)`);
      } else {
        this.logger.log(`Created ${saved.length} notifications`);
      }
      return saved;
    } catch (error) {
      // If check fails, proceed with sending all (safe fallback)
      this.logger.warn(`Failed to check notification settings, sending all: ${error}`);
      const entities = notifications.map(dto => this.notificationRepository.create(dto));
      const saved = await this.notificationRepository.save(entities);
      this.logger.log(`Created ${saved.length} notifications`);
      return saved;
    }
  }

  async findAllForUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .orderBy('notification.created_at', 'DESC');

    if (options?.unreadOnly) {
      query.andWhere('notification.is_read = false');
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
      throw new NotFoundException(`Notification ${id} not found`);
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
  ): Promise<Notification> {
    const [year, month] = monthYear.split('-');
    const monthNames = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
    ];
    const monthName = monthNames[parseInt(month) - 1];

    return this.create({
      userId,
      type: NotificationType.SCHEDULE_APPROVED,
      title: 'Program aprobat',
      message: `Programul tau pentru ${monthName} ${year} a fost aprobat de ${approverName}.`,
      data: { monthYear, approverName },
    });
  }

  async notifyScheduleRejected(
    userId: string,
    monthYear: string,
    reason: string,
    rejectorName: string,
  ): Promise<Notification> {
    const [year, month] = monthYear.split('-');
    const monthNames = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
    ];
    const monthName = monthNames[parseInt(month) - 1];

    return this.create({
      userId,
      type: NotificationType.SCHEDULE_REJECTED,
      title: 'Program respins',
      message: `Programul pentru ${monthName} ${year} a fost respins. Motiv: ${reason}`,
      data: { monthYear, reason, rejectorName },
    });
  }

  async notifyScheduleCreated(
    userIds: string[],
    monthYear: string,
    creatorName: string,
  ): Promise<Notification[]> {
    const [year, month] = monthYear.split('-');
    const monthNames = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
    ];
    const monthName = monthNames[parseInt(month) - 1];

    const notifications = userIds.map(userId => ({
      userId,
      type: NotificationType.SCHEDULE_CREATED,
      title: 'Program nou creat',
      message: `A fost creat un program nou pentru ${monthName} ${year} de catre ${creatorName}.`,
      data: { monthYear, creatorName },
    }));

    return this.createMany(notifications);
  }

  async notifyScheduleUpdated(
    userIds: string[],
    monthYear: string,
    updaterName: string,
  ): Promise<Notification[]> {
    const [year, month] = monthYear.split('-');
    const monthNames = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
    ];
    const monthName = monthNames[parseInt(month) - 1];

    const notifications = userIds.map(userId => ({
      userId,
      type: NotificationType.SCHEDULE_UPDATED,
      title: 'Program actualizat',
      message: `Programul pentru ${monthName} ${year} a fost actualizat de ${updaterName}.`,
      data: { monthYear, updaterName },
    }));

    return this.createMany(notifications);
  }

  async notifyShiftReminder(
    userId: string,
    shiftDate: string,
    shiftTime: string,
    shiftType: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SHIFT_REMINDER,
      title: 'Reminder tura',
      message: `Tura ta ${shiftType} incepe in curand (${shiftTime}).`,
      data: { shiftDate, shiftTime, shiftType },
    });
  }
}
