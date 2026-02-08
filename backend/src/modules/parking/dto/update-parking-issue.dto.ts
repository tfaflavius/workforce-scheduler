import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateParkingIssueDto {
  @IsString()
  @IsOptional()
  equipment?: string;

  @IsString()
  @IsOptional()
  contactedCompany?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
