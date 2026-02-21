import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PvDisplayDayDto } from './create-pv-display-session.dto';

export class UpdatePvDisplaySessionDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  monthYear?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PvDisplayDayDto)
  @IsOptional()
  days?: PvDisplayDayDto[];
}
