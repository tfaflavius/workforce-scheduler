import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBudgetPositionDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(2020)
  year: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['INVESTMENTS', 'CURRENT_EXPENSES'])
  category: 'INVESTMENTS' | 'CURRENT_EXPENSES';

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBudgetPositionDto {
  @IsOptional()
  @IsNumber()
  @Min(2020)
  year?: number;

  @IsOptional()
  @IsString()
  @IsIn(['INVESTMENTS', 'CURRENT_EXPENSES'])
  category?: 'INVESTMENTS' | 'CURRENT_EXPENSES';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
