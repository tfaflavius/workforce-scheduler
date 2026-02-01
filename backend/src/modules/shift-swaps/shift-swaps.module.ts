import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftSwapsController } from './shift-swaps.controller';
import { ShiftSwapsService } from './shift-swaps.service';
import { ShiftSwapRequest } from './entities/shift-swap-request.entity';
import { ShiftSwapResponse } from './entities/shift-swap-response.entity';
import { User } from '../users/entities/user.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { WorkSchedule } from '../schedules/entities/work-schedule.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShiftSwapRequest,
      ShiftSwapResponse,
      User,
      ScheduleAssignment,
      WorkSchedule,
    ]),
    NotificationsModule,
  ],
  controllers: [ShiftSwapsController],
  providers: [ShiftSwapsService],
  exports: [ShiftSwapsService],
})
export class ShiftSwapsModule {}
