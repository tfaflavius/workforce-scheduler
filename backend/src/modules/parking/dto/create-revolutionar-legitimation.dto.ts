import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateRevolutionarLegitimationDto {
  @IsString()
  @IsNotEmpty({ message: 'Numele persoanei este obligatoriu' })
  @MaxLength(255)
  personName: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  cnp?: string;

  @IsString()
  @IsNotEmpty({ message: 'Lege / Hotărâre este obligatorie' })
  @MaxLength(100)
  lawNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Numărul de înmatriculare este obligatoriu' })
  @MaxLength(20)
  carPlate: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  autoNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
