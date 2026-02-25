import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { ParkingLot } from './entities/parking-lot.entity';
import { PaymentMachine } from './entities/payment-machine.entity';
import { ParkingIssue } from './entities/parking-issue.entity';
import { ParkingDamage } from './entities/parking-damage.entity';
import { CashCollection } from './entities/cash-collection.entity';
import { ParkingIssueComment } from './entities/parking-issue-comment.entity';
import { ParkingDamageComment } from './entities/parking-damage-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { EditRequest } from './entities/edit-request.entity';
import { HandicapRequest } from './entities/handicap-request.entity';
import { HandicapRequestComment } from './entities/handicap-request-comment.entity';
import { DomiciliuRequest } from './entities/domiciliu-request.entity';
import { DomiciliuRequestComment } from './entities/domiciliu-request-comment.entity';
import { HandicapLegitimation } from './entities/handicap-legitimation.entity';
import { HandicapLegitimationComment } from './entities/handicap-legitimation-comment.entity';
import { RevolutionarLegitimation } from './entities/revolutionar-legitimation.entity';
import { RevolutionarLegitimationComment } from './entities/revolutionar-legitimation-comment.entity';
import { PvDisplaySession } from './entities/pv-display-session.entity';
import { PvDisplayDay } from './entities/pv-display-day.entity';
import { PvDisplaySessionComment } from './entities/pv-display-session-comment.entity';
import { ParkingDailyTicket } from './entities/parking-daily-ticket.entity';
import { ParkingMonthlySubscription } from './entities/parking-monthly-subscription.entity';
import { ParkingWeeklyOccupancy } from './entities/parking-weekly-occupancy.entity';
import { ParkingMeter } from './entities/parking-meter.entity';
import { ControlSesizare } from './entities/control-sesizare.entity';
import { ControlSesizareComment } from './entities/control-sesizare-comment.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';

// Services
import { ParkingLotsService } from './parking-lots.service';
import { ParkingIssuesService } from './parking-issues.service';
import { ParkingDamagesService } from './parking-damages.service';
import { CashCollectionsService } from './cash-collections.service';
import { EditRequestService } from './edit-request.service';
import { HandicapRequestsService } from './handicap-requests.service';
import { DomiciliuRequestsService } from './domiciliu-requests.service';
import { HandicapLegitimationsService } from './handicap-legitimations.service';
import { RevolutionarLegitimationsService } from './revolutionar-legitimations.service';
import { PvDisplayService } from './pv-display.service';
import { ParkingStatsService } from './parking-stats.service';
import { ParkingMetersService } from './parking-meters.service';
import { ControlSesizariService } from './control-sesizari.service';

// Controllers
import { ParkingLotsController } from './parking-lots.controller';
import { ParkingIssuesController } from './parking-issues.controller';
import { ParkingDamagesController } from './parking-damages.controller';
import { CashCollectionsController } from './cash-collections.controller';
import { EditRequestController } from './edit-request.controller';
import { HandicapRequestsController } from './handicap-requests.controller';
import { DomiciliuRequestsController } from './domiciliu-requests.controller';
import { HandicapLegitimationsController } from './handicap-legitimations.controller';
import { RevolutionarLegitimationsController } from './revolutionar-legitimations.controller';
import { PvDisplayController } from './pv-display.controller';
import { PvCarStatusController } from './pv-car-status.controller';
import { ParkingStatsController } from './parking-stats.controller';
import { ParkingMetersController } from './parking-meters.controller';
import { ControlSesizariController } from './control-sesizari.controller';

// Schedulers
import { ParkingUrgentScheduler } from './parking-urgent.scheduler';
import { PvDisplayScheduler } from './pv-display.scheduler';

// Guards
import { PvDisplayAccessGuard } from './guards/pv-display-access.guard';
import { ControlSesizareAccessGuard } from './guards/control-sesizare-access.guard';

// Other modules
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParkingLot,
      PaymentMachine,
      ParkingIssue,
      ParkingDamage,
      CashCollection,
      ParkingIssueComment,
      ParkingDamageComment,
      ParkingHistory,
      EditRequest,
      HandicapRequest,
      HandicapRequestComment,
      DomiciliuRequest,
      DomiciliuRequestComment,
      HandicapLegitimation,
      HandicapLegitimationComment,
      RevolutionarLegitimation,
      RevolutionarLegitimationComment,
      PvDisplaySession,
      PvDisplayDay,
      PvDisplaySessionComment,
      ParkingDailyTicket,
      ParkingMonthlySubscription,
      ParkingWeeklyOccupancy,
      ParkingMeter,
      ControlSesizare,
      ControlSesizareComment,
      User,
      Department,
      ScheduleAssignment,
    ]),
    NotificationsModule,
    EmailModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    ParkingLotsController,
    ParkingIssuesController,
    ParkingDamagesController,
    CashCollectionsController,
    EditRequestController,
    HandicapRequestsController,
    DomiciliuRequestsController,
    HandicapLegitimationsController,
    RevolutionarLegitimationsController,
    PvDisplayController,
    PvCarStatusController,
    ParkingStatsController,
    ParkingMetersController,
    ControlSesizariController,
  ],
  providers: [
    ParkingLotsService,
    ParkingIssuesService,
    ParkingDamagesService,
    CashCollectionsService,
    EditRequestService,
    HandicapRequestsService,
    DomiciliuRequestsService,
    HandicapLegitimationsService,
    RevolutionarLegitimationsService,
    PvDisplayService,
    ParkingStatsService,
    ParkingMetersService,
    ControlSesizariService,
    PvDisplayAccessGuard,
    ControlSesizareAccessGuard,
    ParkingUrgentScheduler,
    PvDisplayScheduler,
  ],
  exports: [
    ParkingLotsService,
    ParkingIssuesService,
    ParkingDamagesService,
    CashCollectionsService,
    EditRequestService,
    HandicapRequestsService,
    DomiciliuRequestsService,
    HandicapLegitimationsService,
    RevolutionarLegitimationsService,
    PvDisplayService,
    ParkingMetersService,
    ControlSesizariService,
  ],
})
export class ParkingModule {}
