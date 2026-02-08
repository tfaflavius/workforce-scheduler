import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateParkingDamageDto {
  @IsUUID()
  @IsNotEmpty()
  parkingLotId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  damagedEquipment: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  personName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  carPlate: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  signatureData?: string;
}
