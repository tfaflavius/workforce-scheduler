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

  // Câmpuri obligatorii doar pentru AMPLASARE_PANOU și REVOCARE_PANOU
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

  @ValidateIf((o) => o.requestType !== 'CREARE_MARCAJ')
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  autoNumber?: string;

  @ValidateIf((o) => o.requestType !== 'CREARE_MARCAJ')
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone?: string;
}
