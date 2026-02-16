import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  @IsNotEmpty()
  acquisitionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  invoiceNumber: string;

  @IsString()
  @IsNotEmpty()
  invoiceDate: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  monthNumber?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  invoiceDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  monthNumber?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
