import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { StockCategory } from '../constants/equipment-stock.constants';

export class CreateStockEntryDto {
  @IsUUID()
  definitionId: string;

  @IsEnum(StockCategory)
  category: StockCategory;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  dateAdded: string; // ISO date string (YYYY-MM-DD)
}
