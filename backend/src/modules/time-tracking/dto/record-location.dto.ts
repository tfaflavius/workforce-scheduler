import { IsNumber, IsUUID, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class RecordLocationDto {
  @IsUUID()
  timeEntryId: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsBoolean()
  isAutoRecorded?: boolean;
}
