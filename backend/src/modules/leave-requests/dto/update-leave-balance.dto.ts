import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { LeaveType } from '../entities/leave-request.entity';

export class UpdateLeaveBalanceDto {
  @IsEnum(['VACATION', 'MEDICAL', 'BIRTHDAY', 'SPECIAL', 'EXTRA_DAYS'])
  leaveType: LeaveType;

  @IsInt()
  @Min(0)
  totalDays: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  usedDays?: number;
}
