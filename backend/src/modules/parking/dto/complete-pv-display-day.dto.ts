import { IsOptional, IsString } from 'class-validator';

export class CompletePvDisplayDayDto {
  @IsString()
  @IsOptional()
  observations?: string;
}
