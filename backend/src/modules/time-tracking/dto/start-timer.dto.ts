import { IsUUID, IsOptional } from 'class-validator';

export class StartTimerDto {
  @IsOptional()
  @IsUUID()
  taskId?: string;
}
