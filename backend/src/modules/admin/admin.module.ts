import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { ParkingIssue } from '../parking/entities/parking-issue.entity';
import { ParkingDamage } from '../parking/entities/parking-damage.entity';
import { HandicapRequest } from '../parking/entities/handicap-request.entity';
import { HandicapLegitimation } from '../parking/entities/handicap-legitimation.entity';
import { RevolutionarLegitimation } from '../parking/entities/revolutionar-legitimation.entity';
import { PvDisplaySession } from '../parking/entities/pv-display-session.entity';
import { PvDisplayDay } from '../parking/entities/pv-display-day.entity';
import { ControlSesizare } from '../parking/entities/control-sesizare.entity';
import { DomiciliuRequest } from '../parking/entities/domiciliu-request.entity';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import { ShiftSwapRequest } from '../shift-swaps/entities/shift-swap-request.entity';
import { Department } from '../departments/entities/department.entity';
import { WorkSchedule } from '../schedules/entities/work-schedule.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { CashCollection } from '../parking/entities/cash-collection.entity';
import { EditRequest } from '../parking/entities/edit-request.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { ParkingModule } from '../parking/parking.module';
import { TimeTrackingModule } from '../time-tracking/time-tracking.module';
import { DailyReportsModule } from '../daily-reports/daily-reports.module';
import { AdminConsolidatedScheduler } from './admin-consolidated.scheduler';
import { SearchController } from './search.controller';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ParkingIssue,
      ParkingDamage,
      HandicapRequest,
      HandicapLegitimation,
      RevolutionarLegitimation,
      PvDisplaySession,
      PvDisplayDay,
      ControlSesizare,
      DomiciliuRequest,
      LeaveRequest,
      ShiftSwapRequest,
      Department,
      WorkSchedule,
      ScheduleAssignment,
      CashCollection,
      EditRequest,
      Notification,
    ]),
    ParkingModule,
    TimeTrackingModule,
    DailyReportsModule,
  ],
  controllers: [SearchController, DashboardController],
  providers: [AdminConsolidatedScheduler],
})
export class AdminModule {}
