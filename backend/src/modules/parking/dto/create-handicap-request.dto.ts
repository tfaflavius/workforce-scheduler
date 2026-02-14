import { IsNotEmpty, IsString, IsOptional, MaxLength, IsIn, ValidateIf } from 'class-validator';
import { HANDICAP_REQUEST_TYPES, HandicapRequestType } from '../constants/parking.constants';

export class CreateHandicapRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(HANDICAP_REQUEST_TYPES))
  requestType: HandicapRequestType;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsOptional()
  googleMapsLink?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  // Campuri obligatorii doar pentru AMPLASARE_PANOU si REVOCARE_PANOU
  @ValidateIf((o) => o.requestType !== 'CREARE_MARCAJ')
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  personName?: string;

  @ValidateIf((o) => o.requestType !== 'CREARE_MARCAJ')
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  handicapCertificateNumber?: string;

  @ValidateIf((o) => o.requestType !== 'CREARE_MARCAJ')
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  carPlate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  autoNumber?: string;

  @ValidateIf((o) => o.requestType !== 'CREARE_MARCAJ')
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone?: string;

  // CNP - vizibil doar pentru Admin si departamentele Parcari Handicap/Domiciliu
  @IsString()
  @IsOptional()
  @MaxLength(20)
  cnp?: string;
}
