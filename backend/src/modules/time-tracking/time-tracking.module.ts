import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeTrackingService } from './time-tracking.service';
import { TimeTrackingController } from './time-tracking.controller';
import { TimeEntry } from './entities/time-entry.entity';
import { LocationLog } from './entities/location-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TimeEntry, LocationLog])],
  controllers: [TimeTrackingController],
  providers: [TimeTrackingService],
  exports: [TimeTrackingService],
})
export class TimeTrackingModule {}
