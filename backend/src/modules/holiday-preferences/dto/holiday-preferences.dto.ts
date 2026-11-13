import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HOLIDAY_CHOICES, HolidayChoice } from '../entities/holiday-preference.entity';

export class HolidayPreferenceItemDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  /** null / lipsa = sterge preferinta pentru acea zi */
  @IsOptional()
  @IsIn(HOLIDAY_CHOICES)
  choice?: HolidayChoice | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string | null;
}

export class SaveHolidayPreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HolidayPreferenceItemDto)
  preferences: HolidayPreferenceItemDto[];
}

export class UpdateHolidayPeriodDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;
}

export class SetHolidayGroupLockDto {
  @IsString()
  @IsNotEmpty()
  group: string;

  @IsBoolean()
  locked: boolean;
}

export class PostHolidayMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
