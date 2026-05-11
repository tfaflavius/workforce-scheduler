import { IsNotEmpty, IsString } from 'class-validator';

export class AdminAssignPvSigningDayDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
