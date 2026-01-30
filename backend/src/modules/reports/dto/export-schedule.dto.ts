import { IsEnum, IsOptional, IsBoolean, IsString } from 'class-validator';

export class ExportScheduleDto {
  @IsEnum(['PDF', 'EXCEL'])
  format: 'PDF' | 'EXCEL';

  @IsOptional()
  @IsBoolean()
  includeViolations?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeWeeklySummaries?: boolean = true;

  @IsOptional()
  @IsString()
  language?: string = 'ro'; // pentru viitor: 'en', 'fr'
}
