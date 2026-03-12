import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsBoolean, MaxLength } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  data?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  skipPush?: boolean;
}
