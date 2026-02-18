import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { LeaveType } from '../entities/leave-request.entity';

export class AdminEditLeaveRequestDto {
  @IsEnum(['VACATION', 'MEDICAL', 'BIRTHDAY', 'SPECIAL', 'EXTRA_DAYS'])
  @IsOptional()
  leaveType?: LeaveType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
