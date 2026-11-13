import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamActivityInterceptor } from './team-activity.interceptor';

/** Managerii afla de orice actiune a angajatilor din departamentele pe care le controleaza. */
@Module({
  imports: [TypeOrmModule.forFeature([User, Department, Notification]), NotificationsModule],
  providers: [
    TeamActivityInterceptor,
    { provide: APP_INTERCEPTOR, useExisting: TeamActivityInterceptor },
  ],
})
export class TeamActivityModule {}
