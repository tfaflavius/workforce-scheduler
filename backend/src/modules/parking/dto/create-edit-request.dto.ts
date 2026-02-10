import { IsString, IsNotEmpty, IsEnum, IsObject, IsOptional } from 'class-validator';
import { EditRequestType } from '../entities/edit-request.entity';

export class CreateEditRequestDto {
  @IsEnum(['PARKING_ISSUE', 'PARKING_DAMAGE', 'CASH_COLLECTION'])
  requestType: EditRequestType;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsObject()
  proposedChanges: Record<string, any>;

  @IsOptional()
  @IsString()
  reason?: string;
}
