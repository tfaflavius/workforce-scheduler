import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';
import { User } from '../users/entities/user.entity';
import { NotificationSettingCheckService } from './notification-setting-check.service';

// Generate VAPID keys: npx web-push generate-vapid-keys
// Store these in environment variables — never hardcode in production
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  const bootstrapLogger = new Logger('PushNotificationService');
  bootstrapLogger.warn('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars are not set. Push notifications will be disabled.');
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  private readonly vapidConfigured: boolean;

  constructor(
    @InjectRepository(PushSubscription)
    private pushSubscriptionRepository: Repository<PushSubscription>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private settingCheck: NotificationSettingCheckService,
  ) {
    // Configure web-push only if VAPID keys are available
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:admin@workforce-scheduler.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY,
      );
      this.vapidConfigured = true;
    } else {
      this.vapidConfigured = false;
    }
  }

  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY || '';
  }

  async subscribe(userId: string, subscription: webpush.PushSubscription): Promise<PushSubscription> {
    // Check if subscription already exists
    const existing = await this.pushSubscriptionRepository.findOne({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      // Update existing subscription
      existing.userId = userId;
      existing.p256dh = subscription.keys.p256dh;
      existing.auth = subscription.keys.auth;
      return this.pushSubscriptionRepository.save(existing);
    }

    // Create new subscription
    const newSubscription = this.pushSubscriptionRepository.create({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });

    return this.pushSubscriptionRepository.save(newSubscription);
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.pushSubscriptionRepository.delete({ endpoint });
    this.logger.log(`Unsubscribed push notification for endpoint: ${endpoint.substring(0, 50)}...`);
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, any>, notificationType?: string): Promise<void> {
    if (!this.vapidConfigured) {
      this.logger.debug('Push notifications disabled — VAPID keys not configured');
      return;
    }

    // If notification type provided, check push setting
    if (notificationType) {
      try {
        const user = await this.userRepository.findOne({
          where: { id: userId },
          select: ['id', 'role'],
        });
        if (user) {
          const enabled = await this.settingCheck.isPushEnabled(notificationType, user.role);
          if (!enabled) {
            this.logger.debug(`Push notification ${notificationType} suppressed for role ${user.role}`);
            return;
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to check push notification setting, proceeding: ${error}`);
      }
    }

    const subscriptions = await this.pushSubscriptionRepository.find({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`No push subscriptions found for user ${userId}`);
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      data: {
        ...data,
        url: data?.url || '/',
      },
      timestamp: Date.now(),
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
        );
        this.logger.debug(`Push notification sent to user ${userId}`);
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or invalid - remove it
          await this.pushSubscriptionRepository.delete({ id: sub.id });
          this.logger.warn(`Removed expired push subscription for user ${userId}`);
        } else {
          this.logger.error(`Failed to send push notification: ${error.message}`);
        }
      }
    });

    await Promise.all(sendPromises);
  }

  async sendToUsers(userIds: string[], title: string, body: string, data?: Record<string, any>, notificationType?: string): Promise<void> {
    await Promise.all(userIds.map((userId) => this.sendToUser(userId, title, body, data, notificationType)));
  }

  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    return this.pushSubscriptionRepository.find({ where: { userId } });
  }

  async hasSubscription(userId: string): Promise<boolean> {
    const count = await this.pushSubscriptionRepository.count({ where: { userId } });
    return count > 0;
  }

  async clearAllSubscriptions(userId: string): Promise<void> {
    const result = await this.pushSubscriptionRepository.delete({ userId });
    this.logger.log(`Cleared ${result.affected || 0} push subscriptions for user ${userId}`);
  }

  /**
   * Sterge subscriptiile vechi care nu au mai fost folosite de 90+ zile.
   * Apelata periodic pentru curatenie (nu sterge toate subscriptiile).
   */
  async clearExpiredSubscriptions(): Promise<void> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.pushSubscriptionRepository
      .createQueryBuilder()
      .delete()
      .where('updatedAt < :cutoff', { cutoff: ninetyDaysAgo })
      .execute();

    this.logger.log(`Cleared ${result.affected || 0} expired push subscriptions (older than 90 days)`);
  }
}
