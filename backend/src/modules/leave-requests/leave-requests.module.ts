import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { User } from '../users/entities/user.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { Department } from '../departments/entities/department.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveRequest,
      LeaveBalance,
      User,
      ScheduleAssignment,
      Department,
    ]),
    NotificationsModule,
    EmailModule,
  ],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService],
  exports: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
