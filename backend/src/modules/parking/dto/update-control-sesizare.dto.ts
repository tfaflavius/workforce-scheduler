import { IsString, IsOptional, IsIn } from 'class-validator';
import {
  CONTROL_SESIZARE_ZONES,
  ControlSesizareZone,
  PARKING_LAYOUT_TYPES,
  ParkingLayoutType,
} from '../constants/parking.constants';

export class UpdateControlSesizareDto {
  @IsOptional()
  @IsString()
  @IsIn(Object.values(CONTROL_SESIZARE_ZONES))
  zone?: ControlSesizareZone;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(PARKING_LAYOUT_TYPES))
  orientation?: ParkingLayoutType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  googleMapsLink?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
