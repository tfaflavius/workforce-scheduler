import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';

// Generate VAPID keys: npx web-push generate-vapid-keys
// Store these in environment variables in production
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private pushSubscriptionRepository: Repository<PushSubscription>,
  ) {
    // Configure web-push
    webpush.setVapidDetails(
      'mailto:admin@workforce-scheduler.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );
  }

  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
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

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
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
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
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

  async sendToUsers(userIds: string[], title: string, body: string, data?: Record<string, any>): Promise<void> {
    await Promise.all(userIds.map((userId) => this.sendToUser(userId, title, body, data)));
  }

  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    return this.pushSubscriptionRepository.find({ where: { userId } });
  }

  async hasSubscription(userId: string): Promise<boolean> {
    const count = await this.pushSubscriptionRepository.count({ where: { userId } });
    return count > 0;
  }
}
