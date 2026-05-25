import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ControlInspectionNote } from './entities/control-inspection-note.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { ControlNotesService } from './control-notes.service';
import { ControlNotesController } from './control-notes.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ControlInspectionNote,
      User,
      Department,
      // Needed so the service can count days when Control users were
      // actually scheduled on Dispecerat (DISP) and exclude them from
      // the "working days available for control work" divisor.
      ScheduleAssignment,
    ]),
  ],
  controllers: [ControlNotesController],
  providers: [ControlNotesService],
  exports: [ControlNotesService],
})
export class ControlNotesModule {}
