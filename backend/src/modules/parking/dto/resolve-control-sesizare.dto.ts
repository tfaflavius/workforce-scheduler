import { IsString, IsNotEmpty } from 'class-validator';

export class ResolveControlSesizareDto {
  @IsString()
  @IsNotEmpty()
  resolutionDescription: string;
}
