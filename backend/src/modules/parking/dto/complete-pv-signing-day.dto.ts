import { IsOptional, IsString } from 'class-validator';

export class CompletePvSigningDayDto {
  @IsString()
  @IsOptional()
  observations?: string;
}
