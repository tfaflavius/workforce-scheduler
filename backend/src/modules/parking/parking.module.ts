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
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';

// Services
import { ParkingLotsService } from './parking-lots.service';
import { ParkingIssuesService } from './parking-issues.service';
import { ParkingDamagesService } from './parking-damages.service';
import { CashCollectionsService } from './cash-collections.service';

// Controllers
import { ParkingLotsController } from './parking-lots.controller';
import { ParkingIssuesController } from './parking-issues.controller';
import { ParkingDamagesController } from './parking-damages.controller';
import { CashCollectionsController } from './cash-collections.controller';

// Schedulers
import { ParkingUrgentScheduler } from './parking-urgent.scheduler';

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
      User,
      Department,
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
  ],
  providers: [
    ParkingLotsService,
    ParkingIssuesService,
    ParkingDamagesService,
    CashCollectionsService,
    ParkingUrgentScheduler,
  ],
  exports: [
    ParkingLotsService,
    ParkingIssuesService,
    ParkingDamagesService,
    CashCollectionsService,
  ],
})
export class ParkingModule {}
