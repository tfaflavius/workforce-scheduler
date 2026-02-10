import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class ReviewEditRequestDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
