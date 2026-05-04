import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ControlInspectionNote } from './entities/control-inspection-note.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { ControlNotesService } from './control-notes.service';
import { ControlNotesController } from './control-notes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ControlInspectionNote, User, Department])],
  controllers: [ControlNotesController],
  providers: [ControlNotesService],
  exports: [ControlNotesService],
})
export class ControlNotesModule {}
