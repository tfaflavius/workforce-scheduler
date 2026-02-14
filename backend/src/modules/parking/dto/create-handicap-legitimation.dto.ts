import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateHandicapLegitimationDto {
  @IsString()
  @IsNotEmpty({ message: 'Numele persoanei este obligatoriu' })
  @MaxLength(255)
  personName: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  cnp?: string;

  @IsString()
  @IsNotEmpty({ message: 'Numarul certificatului de handicap este obligatoriu' })
  @MaxLength(100)
  handicapCertificateNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Numarul de inmatriculare este obligatoriu' })
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
