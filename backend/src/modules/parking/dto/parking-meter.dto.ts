import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ParkingZone, PowerSource, MeterCondition } from '../entities/parking-meter.entity';

export class CreateParkingMeterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEnum(ParkingZone)
  zone: ParkingZone;

  @IsEnum(PowerSource)
  powerSource: PowerSource;

  @IsEnum(MeterCondition)
  condition: MeterCondition;
}

export class UpdateParkingMeterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(ParkingZone)
  zone?: ParkingZone;

  @IsOptional()
  @IsEnum(PowerSource)
  powerSource?: PowerSource;

  @IsOptional()
  @IsEnum(MeterCondition)
  condition?: MeterCondition;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
