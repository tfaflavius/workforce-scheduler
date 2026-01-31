import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { WorkSchedule } from './entities/work-schedule.entity';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';
import { ShiftType } from './entities/shift-type.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkSchedule, ScheduleAssignment, ShiftType, User]),
    NotificationsModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
