import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminCancelLeaveRequestDto {
  @ApiPropertyOptional({
    description: 'Motivul anularii (trimis angajatului)',
    example: 'Necesar personal suplimentar in perioada respectiva',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}
