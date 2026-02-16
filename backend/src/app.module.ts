import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './common/supabase/supabase.module';
import { EmailModule } from './common/email/email.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ShiftSwapsModule } from './modules/shift-swaps/shift-swaps.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { User } from './modules/users/entities/user.entity';
import { Department } from './modules/departments/entities/department.entity';
import { WorkSchedule } from './modules/schedules/entities/work-schedule.entity';
import { ScheduleAssignment } from './modules/schedules/entities/schedule-assignment.entity';
import { ShiftType } from './modules/schedules/entities/shift-type.entity';
import { WorkPosition } from './modules/schedules/entities/work-position.entity';
import { Notification } from './modules/notifications/entities/notification.entity';
import { PushSubscription } from './modules/notifications/entities/push-subscription.entity';
import { ShiftSwapRequest } from './modules/shift-swaps/entities/shift-swap-request.entity';
import { ShiftSwapResponse } from './modules/shift-swaps/entities/shift-swap-response.entity';
import { LeaveRequest } from './modules/leave-requests/entities/leave-request.entity';
import { LeaveBalance } from './modules/leave-requests/entities/leave-balance.entity';
import { ParkingModule } from './modules/parking/parking.module';
import { DailyReportsModule } from './modules/daily-reports/daily-reports.module';
import { DailyReport } from './modules/daily-reports/entities/daily-report.entity';
import { ParkingLot } from './modules/parking/entities/parking-lot.entity';
import { PaymentMachine } from './modules/parking/entities/payment-machine.entity';
import { ParkingIssue } from './modules/parking/entities/parking-issue.entity';
import { ParkingDamage } from './modules/parking/entities/parking-damage.entity';
import { CashCollection } from './modules/parking/entities/cash-collection.entity';
import { ParkingIssueComment } from './modules/parking/entities/parking-issue-comment.entity';
import { ParkingDamageComment } from './modules/parking/entities/parking-damage-comment.entity';
import { ParkingHistory } from './modules/parking/entities/parking-history.entity';
import { EditRequest } from './modules/parking/entities/edit-request.entity';
import { HandicapRequest } from './modules/parking/entities/handicap-request.entity';
import { HandicapRequestComment } from './modules/parking/entities/handicap-request-comment.entity';
import { DomiciliuRequest } from './modules/parking/entities/domiciliu-request.entity';
import { DomiciliuRequestComment } from './modules/parking/entities/domiciliu-request-comment.entity';
import { HandicapLegitimation } from './modules/parking/entities/handicap-legitimation.entity';
import { HandicapLegitimationComment } from './modules/parking/entities/handicap-legitimation-comment.entity';
import { RevolutionarLegitimation } from './modules/parking/entities/revolutionar-legitimation.entity';
import { RevolutionarLegitimationComment } from './modules/parking/entities/revolutionar-legitimation-comment.entity';
import { TimeTrackingModule } from './modules/time-tracking/time-tracking.module';
import { TimeEntry } from './modules/time-tracking/entities/time-entry.entity';
import { LocationLog } from './modules/time-tracking/entities/location-log.entity';
import { TasksModule } from './modules/tasks/tasks.module';
import { Task } from './modules/tasks/entities/task.entity';
import { TaskHistory } from './modules/tasks/entities/task-history.entity';
import { AcquisitionsModule } from './modules/acquisitions/acquisitions.module';
import { BudgetPosition } from './modules/acquisitions/entities/budget-position.entity';
import { Acquisition } from './modules/acquisitions/entities/acquisition.entity';
import { AcquisitionInvoice } from './modules/acquisitions/entities/acquisition-invoice.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    EmailModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'workforce_db',
      entities: [User, Department, WorkSchedule, ScheduleAssignment, ShiftType, WorkPosition, Notification, PushSubscription, ShiftSwapRequest, ShiftSwapResponse, LeaveRequest, LeaveBalance, ParkingLot, PaymentMachine, ParkingIssue, ParkingDamage, CashCollection, ParkingIssueComment, ParkingDamageComment, ParkingHistory, EditRequest, HandicapRequest, HandicapRequestComment, DomiciliuRequest, DomiciliuRequestComment, HandicapLegitimation, HandicapLegitimationComment, RevolutionarLegitimation, RevolutionarLegitimationComment, DailyReport, TimeEntry, LocationLog, Task, TaskHistory, BudgetPosition, Acquisition, AcquisitionInvoice],
      synchronize: true,
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }),
    AuthModule,
    UsersModule,
    DepartmentsModule,
    SchedulesModule,
    NotificationsModule,
    ShiftSwapsModule,
    LeaveRequestsModule,
    ParkingModule,
    DailyReportsModule,
    TimeTrackingModule,
    TasksModule,
    AcquisitionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

