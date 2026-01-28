import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleAssignmentDto } from './create-schedule.dto';

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  approvalNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAssignmentDto)
  assignments?: ScheduleAssignmentDto[];
}
