import { IsNotEmpty, IsString } from 'class-validator';

export class ResolveHandicapRequestDto {
  @IsString()
  @IsNotEmpty()
  resolutionDescription: string;
}
