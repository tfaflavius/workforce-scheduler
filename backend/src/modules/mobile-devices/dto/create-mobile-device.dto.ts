import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateMobileDeviceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deviceType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  model: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  serialImei?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  simOperator?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  simSerial?: string | null;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
