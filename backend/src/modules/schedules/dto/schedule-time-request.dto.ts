import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AUTO_SCHEDULE_STARTS } from '../auto-schedule.constants';

export class CreateScheduleTimeRequestDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsIn([...AUTO_SCHEDULE_STARTS])
  startTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RespondScheduleTimeRequestDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
