import { IsString, IsOptional, MaxLength, IsIn, ValidateIf } from 'class-validator';
import { HANDICAP_REQUEST_TYPES, HandicapRequestType } from '../constants/parking.constants';

export class UpdateHandicapRequestDto {
  @IsString()
  @IsOptional()
  @IsIn(Object.values(HANDICAP_REQUEST_TYPES))
  requestType?: HandicapRequestType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  googleMapsLink?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  personName?: string;

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
}
