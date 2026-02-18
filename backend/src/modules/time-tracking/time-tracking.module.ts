import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeTrackingService } from './time-tracking.service';
import { TimeTrackingController } from './time-tracking.controller';
import { GpsTrackingScheduler } from './gps-tracking.scheduler';
import { GeocodingService } from './geocoding.service';
import { TimeEntry } from './entities/time-entry.entity';
import { LocationLog } from './entities/location-log.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { WorkSchedule } from '../schedules/entities/work-schedule.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimeEntry,
      LocationLog,
      ScheduleAssignment,
      WorkSchedule,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [TimeTrackingController],
  providers: [TimeTrackingService, GpsTrackingScheduler, GeocodingService],
  exports: [TimeTrackingService, GeocodingService],
})
export class TimeTrackingModule {}
