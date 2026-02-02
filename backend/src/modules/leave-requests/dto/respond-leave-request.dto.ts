import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RespondLeaveRequestDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  message?: string;
}
