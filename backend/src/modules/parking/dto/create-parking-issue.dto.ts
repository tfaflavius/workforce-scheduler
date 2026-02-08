import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateParkingIssueDto {
  @IsUUID()
  @IsNotEmpty()
  parkingLotId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  equipment: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contactedCompany: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
