import { IsString, IsNotEmpty } from 'class-validator';

export class ResolveDomiciliuRequestDto {
  @IsString()
  @IsNotEmpty()
  resolutionDescription: string;
}
