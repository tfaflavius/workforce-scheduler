import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolidayPeriod } from './entities/holiday-period.entity';
import { HolidayPreference } from './entities/holiday-preference.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { ShiftType } from '../schedules/entities/shift-type.entity';
import { WorkSchedule } from '../schedules/entities/work-schedule.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { SchedulesModule } from '../schedules/schedules.module';
import { LeaveRequestsModule } from '../leave-requests/leave-requests.module';
import { HolidayPreferencesService } from './holiday-preferences.service';
import { HolidayPreferencesController } from './holiday-preferences.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HolidayPeriod,
      HolidayPreference,
      User,
      Department,
      ShiftType,
      WorkSchedule,
      ScheduleAssignment,
    ]),
    SchedulesModule,
    LeaveRequestsModule,
  ],
  controllers: [HolidayPreferencesController],
  providers: [HolidayPreferencesService],
})
export class HolidayPreferencesModule {}
