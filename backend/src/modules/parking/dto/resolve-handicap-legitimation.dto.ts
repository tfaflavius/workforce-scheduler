import { IsString, IsNotEmpty } from 'class-validator';

export class ResolveHandicapLegitimationDto {
  @IsString()
  @IsNotEmpty({ message: 'Descrierea rezoluției este obligatorie' })
  resolutionDescription: string;
}
