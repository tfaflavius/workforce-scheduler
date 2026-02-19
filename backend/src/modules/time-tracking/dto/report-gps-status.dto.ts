import { IsString, IsOptional, IsIn } from 'class-validator';

export class ReportGpsStatusDto {
  @IsString()
  @IsIn(['active', 'denied', 'error', 'unavailable'])
  status: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}
