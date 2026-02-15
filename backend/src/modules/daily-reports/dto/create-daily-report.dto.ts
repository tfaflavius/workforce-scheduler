import { IsString, IsOptional, IsEnum, IsDateString, MinLength } from 'class-validator';
import { DailyReportStatus } from '../entities/daily-report.entity';

export class CreateDailyReportDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsEnum(DailyReportStatus)
  @IsOptional()
  status?: DailyReportStatus;
}
