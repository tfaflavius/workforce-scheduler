import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleAssignmentDto } from './create-schedule.dto';

export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: 'Updated schedule status', example: 'APPROVED' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Notes related to the approval or rejection', example: 'Approved with minor adjustments' })
  @IsOptional()
  @IsString()
  approvalNotes?: string;

  @ApiPropertyOptional({ description: 'Updated list of shift assignments', type: [ScheduleAssignmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAssignmentDto)
  assignments?: ScheduleAssignmentDto[];
}
