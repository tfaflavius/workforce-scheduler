import { IsString, IsOptional, IsUUID, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleAssignmentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  shiftTypeId: string;

  @IsString()
  shiftDate: string; // Format: YYYY-MM-DD

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
  @IsString()
  monthYear: string; // Format: YYYY-MM

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAssignmentDto)
  assignments?: ScheduleAssignmentDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;
}
