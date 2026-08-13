import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateParkingLevelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  parkingName: string;

  @IsOptional()
  @IsInt()
  parkingOrder?: number;

  @IsOptional()
  @IsInt()
  levelOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  levelNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  levelName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  normal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  handicap?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  mamaCopil?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  electric?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rezervat?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  moto?: number;
}

export class UpdateParkingLevelDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  parkingName?: string;

  @IsOptional()
  @IsInt()
  levelOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  levelNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  levelName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  normal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  handicap?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  mamaCopil?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  electric?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rezervat?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  moto?: number;
}
