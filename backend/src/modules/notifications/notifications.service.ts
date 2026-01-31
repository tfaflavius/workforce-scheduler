import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(createNotificationDto);
    const saved = await this.notificationRepository.save(notification);
    this.logger.log(`Created notification for user ${createNotificationDto.userId}: ${createNotificationDto.title}`);
    return saved;
  }

  async createMany(notifications: CreateNotificationDto[]): Promise<Notification[]> {
    const entities = notifications.map(dto => this.notificationRepository.create(dto));
    const saved = await this.notificationRepository.save(entities);
    this.logger.log(`Created ${saved.length} notifications`);
    return saved;
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
    return this.notificationRepository.findOne({ where: { id } });
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
      message: `Programul tău pentru ${monthName} ${year} a fost aprobat de ${approverName}.`,
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
      message: `A fost creat un program nou pentru ${monthName} ${year} de către ${creatorName}.`,
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
      title: 'Reminder tură',
      message: `Tura ta ${shiftType} începe în curând (${shiftTime}).`,
      data: { shiftDate, shiftTime, shiftType },
    });
  }
}
