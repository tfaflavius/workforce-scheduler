import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class BroadcastDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsString()
  @Matches(/^\/[a-z0-9/-]*$/i)
  url?: string;
}
