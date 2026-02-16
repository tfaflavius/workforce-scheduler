import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class UpsertMonthlyRevenueDto {
  @IsUUID()
  @IsNotEmpty()
  revenueCategoryId: string;

  @IsInt()
  @IsNotEmpty()
  @Min(2020)
  year: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(0)
  incasari: number;

  @IsNumber()
  @Min(0)
  cheltuieli: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMonthlyRevenueDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  incasari?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cheltuieli?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
