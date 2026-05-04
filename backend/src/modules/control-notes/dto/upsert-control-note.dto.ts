import { IsInt, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertControlNoteDto {
  @IsUUID()
  userId: string;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  /** Pass null/0 to clear the count for that user/year/month */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  count: number;

  @IsString()
  @IsOptional()
  marker?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
