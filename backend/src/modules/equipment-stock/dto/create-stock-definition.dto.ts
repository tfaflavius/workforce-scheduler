import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  MaxLength,
} from 'class-validator';
import { StockCategory } from '../constants/equipment-stock.constants';

const VALID_CATEGORIES = [...Object.values(StockCategory), 'ALL'];

export class CreateStockDefinitionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsIn(VALID_CATEGORIES)
  category: StockCategory | 'ALL';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
