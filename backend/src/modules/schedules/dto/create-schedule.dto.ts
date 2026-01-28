import { IsString, IsOptional, IsUUID, IsArray, ValidateNested } from 'class-validator';
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
}
