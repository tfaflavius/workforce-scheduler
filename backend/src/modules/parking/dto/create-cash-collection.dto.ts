import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCashCollectionDto {
  @IsUUID()
  @IsNotEmpty()
  parkingLotId: string;

  @IsUUID()
  @IsNotEmpty()
  paymentMachineId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
