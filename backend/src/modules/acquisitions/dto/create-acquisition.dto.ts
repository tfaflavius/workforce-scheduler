import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
  Min,
  IsInt,
  Max,
} from 'class-validator';

export class CreateAcquisitionDto {
  @IsUUID()
  @IsNotEmpty()
  budgetPositionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  value: number;

  @IsOptional()
  @IsBoolean()
  isFullPurchase?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caietDeSarcini?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notaJustificativa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  contractNumber?: string;

  @IsOptional()
  @IsString()
  contractDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ordinIncepere?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  procesVerbalReceptie?: string;

  @IsOptional()
  @IsBoolean()
  isServiceContract?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  serviceMonths?: number;

  @IsOptional()
  @IsString()
  serviceStartDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  receptionDay?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAcquisitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsBoolean()
  isFullPurchase?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caietDeSarcini?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notaJustificativa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  contractNumber?: string;

  @IsOptional()
  @IsString()
  contractDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ordinIncepere?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  procesVerbalReceptie?: string;

  @IsOptional()
  @IsBoolean()
  isServiceContract?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  serviceMonths?: number;

  @IsOptional()
  @IsString()
  serviceStartDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  receptionDay?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
