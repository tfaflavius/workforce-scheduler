import { IsString, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { TaskPriority, TaskUrgency } from '../entities/task.entity';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskUrgency)
  urgency?: TaskUrgency;

  @IsOptional()
  @IsString()
  taskType?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
