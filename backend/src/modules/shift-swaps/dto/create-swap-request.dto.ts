import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSwapRequestDto {
  @IsDateString()
  @IsNotEmpty()
  requesterDate: string; // Data pe care o are userul (YYYY-MM-DD)

  @IsDateString()
  @IsNotEmpty()
  targetDate: string; // Data pe care o doreste (YYYY-MM-DD)

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string; // Motivul cererii
}
