import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveType } from '../entities/leave-request.entity';

export class CreateLeaveRequestDto {
  @ApiProperty({ description: 'Type of leave', enum: ['VACATION', 'MEDICAL', 'BIRTHDAY', 'SPECIAL', 'EXTRA_DAYS'], example: 'VACATION' })
  @IsEnum(['VACATION', 'MEDICAL', 'BIRTHDAY', 'SPECIAL', 'EXTRA_DAYS'])
  leaveType: LeaveType;

  @ApiProperty({ description: 'Leave start date in ISO 8601 format', example: '2026-04-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Leave end date in ISO 8601 format', example: '2026-04-05' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Reason for the leave request', example: 'Family vacation' })
  @IsString()
  @IsOptional()
  reason?: string;
}
