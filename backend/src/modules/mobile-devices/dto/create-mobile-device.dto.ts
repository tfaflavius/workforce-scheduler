import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsNotEmpty,
  IsIn,
  IsDateString,
} from 'class-validator';

export const MOBILE_DEVICE_STATUSES = ['Functional', 'Defect', 'In reparatie', 'Casat'] as const;

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
  @IsString()
  @IsIn(MOBILE_DEVICE_STATUSES)
  status?: string;

  @IsOptional()
  @IsDateString()
  handoverDate?: string | null;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
