import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class AdminAssignPvDayDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsIn(['1', '2'])
  slot: '1' | '2'; // Slotul de asignare (1 sau 2)
}
