import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import { DailyReport } from '../daily-reports/entities/daily-report.entity';
import { HandicapRequest } from '../parking/entities/handicap-request.entity';
import { HandicapLegitimation } from '../parking/entities/handicap-legitimation.entity';
import { RevolutionarLegitimation } from '../parking/entities/revolutionar-legitimation.entity';
import { DomiciliuRequest } from '../parking/entities/domiciliu-request.entity';
import { ControlSesizare } from '../parking/entities/control-sesizare.entity';
import { ParkingIssue } from '../parking/entities/parking-issue.entity';
import { ParkingDamage } from '../parking/entities/parking-damage.entity';
import { CashCollection } from '../parking/entities/cash-collection.entity';
import { Acquisition } from '../acquisitions/entities/acquisition.entity';
import { BudgetPosition } from '../acquisitions/entities/budget-position.entity';
import { MonthlyRevenue } from '../acquisitions/entities/monthly-revenue.entity';
import { EquipmentStockEntry } from '../equipment-stock/entities/equipment-stock-entry.entity';
import { EquipmentStockDefinition } from '../equipment-stock/entities/equipment-stock-definition.entity';
import { ControlInspectionNote } from '../control-notes/entities/control-inspection-note.entity';
import { UserDashboardController } from './user-dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      LeaveRequest,
      DailyReport,
      HandicapRequest,
      HandicapLegitimation,
      RevolutionarLegitimation,
      DomiciliuRequest,
      ControlSesizare,
      ParkingIssue,
      ParkingDamage,
      CashCollection,
      Acquisition,
      BudgetPosition,
      MonthlyRevenue,
      EquipmentStockEntry,
      EquipmentStockDefinition,
      ControlInspectionNote,
    ]),
  ],
  controllers: [UserDashboardController],
})
export class UserDashboardModule {}
