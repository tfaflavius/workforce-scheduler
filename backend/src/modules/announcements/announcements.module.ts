import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementScheduleScheduler } from './announcement-schedule.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([User, Notification]), NotificationsModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, AnnouncementScheduleScheduler],
})
export class AnnouncementsModule {}
