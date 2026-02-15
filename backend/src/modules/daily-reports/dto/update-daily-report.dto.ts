import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { DailyReportStatus } from '../entities/daily-report.entity';

export class UpdateDailyReportDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  content?: string;

  @IsEnum(DailyReportStatus)
  @IsOptional()
  status?: DailyReportStatus;
}
