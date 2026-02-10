import { IsString, IsNotEmpty, IsOptional, IsIn, IsEmail } from 'class-validator';
import { DOMICILIU_REQUEST_TYPES } from '../constants/parking.constants';

export class CreateDomiciliuRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(DOMICILIU_REQUEST_TYPES))
  requestType: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsOptional()
  googleMapsLink?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  personName: string;

  @IsString()
  @IsOptional()
  cnp?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  carPlate: string;

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
