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
import { DailyReport } from '../daily-reports/entities/daily-report.entity';
import { ParkingMeter } from '../parking/entities/parking-meter.entity';
import { Acquisition } from '../acquisitions/entities/acquisition.entity';
import { BudgetPosition } from '../acquisitions/entities/budget-position.entity';
import { EquipmentStockDefinition } from '../equipment-stock/entities/equipment-stock-definition.entity';
import { EquipmentStockEntry } from '../equipment-stock/entities/equipment-stock-entry.entity';
import { MonthlyRevenue } from '../acquisitions/entities/monthly-revenue.entity';
import { ControlInspectionNote } from '../control-notes/entities/control-inspection-note.entity';
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
      DailyReport,
      ParkingMeter,
      Acquisition,
      BudgetPosition,
      EquipmentStockDefinition,
      EquipmentStockEntry,
      MonthlyRevenue,
      ControlInspectionNote,
    ]),
    ParkingModule,
    TimeTrackingModule,
    DailyReportsModule,
  ],
  controllers: [SearchController, DashboardController],
  providers: [AdminConsolidatedScheduler],
})
export class AdminModule {}
