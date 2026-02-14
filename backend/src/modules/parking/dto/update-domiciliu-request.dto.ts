import { IsString, IsOptional, IsIn, IsEmail, IsInt, Min } from 'class-validator';
import { DOMICILIU_REQUEST_TYPES, PARKING_LAYOUT_TYPES } from '../constants/parking.constants';

export class UpdateDomiciliuRequestDto {
  @IsString()
  @IsOptional()
  @IsIn(Object.values(DOMICILIU_REQUEST_TYPES))
  requestType?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  googleMapsLink?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  numberOfSpots?: number;

  @IsString()
  @IsOptional()
  @IsIn(Object.values(PARKING_LAYOUT_TYPES))
  parkingLayout?: string;

  @IsString()
  @IsOptional()
  personName?: string;

  @IsString()
  @IsOptional()
  cnp?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  carPlate?: string;

  @IsString()
  @IsOptional()
  carBrand?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsOptional()
  contractNumber?: string;
}
