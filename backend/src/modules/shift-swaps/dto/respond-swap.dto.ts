import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SwapResponseType } from '../entities/shift-swap-response.entity';

export class RespondSwapDto {
  @IsEnum(SwapResponseType)
  response: SwapResponseType; // ACCEPTED sau REJECTED

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string; // Mesaj optional
}
