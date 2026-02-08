import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class ResolveDamageDto {
  @IsEnum(['RECUPERAT', 'TRIMIS_JURIDIC'])
  @IsNotEmpty()
  resolutionType: 'RECUPERAT' | 'TRIMIS_JURIDIC';

  @IsString()
  @IsNotEmpty()
  resolutionDescription: string;
}
