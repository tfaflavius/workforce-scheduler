import { IsString, IsOptional, IsEnum, IsUUID, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskUrgency } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title', example: 'Review monthly report' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Detailed task description', example: 'Review and approve the monthly financial report for March' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Task priority level', enum: TaskPriority, example: 'HIGH' })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Task urgency level', enum: TaskUrgency, example: 'URGENT' })
  @IsOptional()
  @IsEnum(TaskUrgency)
  urgency?: TaskUrgency;

  @ApiPropertyOptional({ description: 'Type or category of the task', example: 'REVIEW' })
  @IsOptional()
  @IsString()
  taskType?: string;

  @ApiPropertyOptional({ description: 'Due date in ISO 8601 format', example: '2026-04-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'UUID of the user to assign the task to', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
