import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RespondLeaveRequestDto {
  @ApiProperty({ description: 'Response status for the leave request', enum: ['APPROVED', 'REJECTED'], example: 'APPROVED' })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Optional message or reason for the decision', example: 'Approved, enjoy your vacation!' })
  @IsString()
  @IsOptional()
  message?: string;
}
