import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PvSigningDayDto } from './create-pv-signing-session.dto';

export class UpdatePvSigningSessionDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  monthYear?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PvSigningDayDto)
  @IsOptional()
  days?: PvSigningDayDto[];
}
