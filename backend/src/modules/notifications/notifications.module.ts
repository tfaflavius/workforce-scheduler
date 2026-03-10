import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationSettingCheckService } from './notification-setting-check.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificationSetting } from '../permissions/entities/notification-setting.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, PushSubscription, NotificationSetting, User])],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushNotificationService, NotificationSettingCheckService],
  exports: [NotificationsService, PushNotificationService, NotificationSettingCheckService],
})
export class NotificationsModule {}
