import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, PushSubscription])],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushNotificationService],
  exports: [NotificationsService, PushNotificationService],
})
export class NotificationsModule {}
