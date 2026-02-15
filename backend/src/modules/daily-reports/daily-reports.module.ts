import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyReportsController } from './daily-reports.controller';
import { DailyReportsService } from './daily-reports.service';
import { DailyReportsScheduler } from './daily-reports.scheduler';
import { DailyReport } from './entities/daily-report.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { WorkPosition } from '../schedules/entities/work-position.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyReport,
      User,
      Department,
      ScheduleAssignment,
      WorkPosition,
    ]),
    NotificationsModule,
    EmailModule,
  ],
  controllers: [DailyReportsController],
  providers: [DailyReportsService, DailyReportsScheduler],
  exports: [DailyReportsService],
})
export class DailyReportsModule {}
