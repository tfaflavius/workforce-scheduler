import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { OvertimeService } from './services/overtime.service';
import { GeneratedReport } from './entities/generated-report.entity';
import { TimeEntry } from '../time-tracking/entities/time-entry.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { SchedulesModule } from '../schedules/schedules.module';
import { StorageService } from '../../common/services/storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GeneratedReport,
      TimeEntry,
      ScheduleAssignment,
    ]),
    SchedulesModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, OvertimeService, StorageService],
  exports: [ReportsService],
})
export class ReportsModule {}
