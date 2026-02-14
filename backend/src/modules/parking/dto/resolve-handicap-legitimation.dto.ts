import { IsString, IsNotEmpty } from 'class-validator';

export class ResolveHandicapLegitimationDto {
  @IsString()
  @IsNotEmpty({ message: 'Descrierea rezolutiei este obligatorie' })
  resolutionDescription: string;
}
