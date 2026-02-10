import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateHandicapLegitimationDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  personName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  cnp?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  handicapCertificateNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  carPlate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  autoNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
