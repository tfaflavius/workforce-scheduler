import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class PvSigningDayDto {
  @IsDateString()
  @IsNotEmpty()
  signingDate: string;

  @IsInt()
  @Min(1)
  dayOrder: number;

  @IsInt()
  @Min(1)
  noticeCount: number;

  @IsString()
  @IsOptional()
  firstNoticeSeries?: string;

  @IsString()
  @IsOptional()
  firstNoticeNumber?: string;

  @IsString()
  @IsOptional()
  lastNoticeSeries?: string;

  @IsString()
  @IsOptional()
  lastNoticeNumber?: string;

  @IsDateString()
  @IsOptional()
  noticesDateFrom?: string;

  @IsDateString()
  @IsOptional()
  noticesDateTo?: string;
}

export class CreatePvSigningSessionDto {
  @IsString()
  @IsNotEmpty()
  monthYear: string; // Format: "2025-01"

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PvSigningDayDto)
  days: PvSigningDayDto[];
}
