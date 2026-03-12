import { IsString, IsOptional, IsEnum, IsDateString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DailyReportStatus } from '../entities/daily-report.entity';

export class CreateDailyReportDto {
  @ApiPropertyOptional({ description: 'Report date in ISO 8601 format (defaults to today)', example: '2026-03-12' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ description: 'Report content', example: 'Completed patrol routes A and B. No incidents reported.' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({ description: 'Report status', enum: DailyReportStatus, example: 'DRAFT' })
  @IsEnum(DailyReportStatus)
  @IsOptional()
  status?: DailyReportStatus;
}
