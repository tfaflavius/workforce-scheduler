import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { WorkPositionsService } from './work-positions.service';
import { WorkPositionsController } from './work-positions.controller';
import { WorkSchedule } from './entities/work-schedule.entity';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';
import { ShiftType } from './entities/shift-type.entity';
import { WorkPosition } from './entities/work-position.entity';
import { User } from '../users/entities/user.entity';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { OfficeSchedulePrefillService } from './office-schedule-prefill.service';
import { OfficeSchedulePrefillScheduler } from './office-schedule-prefill.scheduler';
import { ScheduleTimeRequest } from './entities/schedule-time-request.entity';
import { ScheduleTimeRequestsService } from './schedule-time-requests.service';
import { ScheduleTimeRequestsController } from './schedule-time-requests.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkSchedule,
      ScheduleAssignment,
      ShiftType,
      WorkPosition,
      User,
      LeaveRequest,
      ScheduleTimeRequest,
    ]),
    NotificationsModule,
  ],
  controllers: [SchedulesController, WorkPositionsController, ScheduleTimeRequestsController],
  providers: [
    SchedulesService,
    WorkPositionsService,
    OfficeSchedulePrefillService,
    OfficeSchedulePrefillScheduler,
    ScheduleTimeRequestsService,
  ],
  exports: [SchedulesService, WorkPositionsService],
})
export class SchedulesModule {}
