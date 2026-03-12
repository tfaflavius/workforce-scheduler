import { IsUUID, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StartTimerDto {
  @ApiPropertyOptional({ description: 'UUID of the task to track time against', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  taskId?: string;
}
