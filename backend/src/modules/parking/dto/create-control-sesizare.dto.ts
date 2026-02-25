import { IsNotEmpty, IsString, IsOptional, IsIn, ValidateIf } from 'class-validator';
import {
  CONTROL_SESIZARE_TYPES,
  ControlSesizareType,
  CONTROL_SESIZARE_ZONES,
  ControlSesizareZone,
  PARKING_LAYOUT_TYPES,
  ParkingLayoutType,
} from '../constants/parking.constants';

export class CreateControlSesizareDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(CONTROL_SESIZARE_TYPES))
  type: ControlSesizareType;

  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(CONTROL_SESIZARE_ZONES))
  zone: ControlSesizareZone;

  // Orientare obligatorie doar pentru MARCAJ
  @ValidateIf((o) => o.type === 'MARCAJ')
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(PARKING_LAYOUT_TYPES))
  orientation?: ParkingLayoutType;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsOptional()
  googleMapsLink?: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
