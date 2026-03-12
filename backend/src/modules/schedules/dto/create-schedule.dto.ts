import { IsString, IsOptional, IsUUID, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleAssignmentDto {
  @ApiProperty({ description: 'UUID of the user being assigned', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'UUID of the shift type', example: '660e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  shiftTypeId: string;

  @ApiProperty({ description: 'Date of the shift (YYYY-MM-DD)', example: '2026-04-01' })
  @IsString()
  shiftDate: string; // Format: YYYY-MM-DD

  @ApiPropertyOptional({ description: 'UUID of the work position (e.g., Dispecerat, Control)', example: '770e8400-e29b-41d4-a716-446655440002' })
  @IsOptional()
  @IsUUID()
  workPositionId?: string; // Position: Dispecerat, Control, etc.

  @ApiPropertyOptional({ description: 'Additional notes for this assignment', example: 'Covering for absent colleague' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export enum ScheduleStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class CreateScheduleDto {
  @ApiProperty({ description: 'Month and year for the schedule (YYYY-MM)', example: '2026-04' })
  @IsString()
  monthYear: string; // Format: YYYY-MM

  @ApiPropertyOptional({ description: 'UUID of the department', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'List of shift assignments for this schedule', type: [ScheduleAssignmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAssignmentDto)
  assignments?: ScheduleAssignmentDto[];

  @ApiPropertyOptional({ description: 'General notes for the schedule', example: 'Holiday schedule adjustments' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Schedule status', enum: ScheduleStatus, example: 'DRAFT' })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;
}
