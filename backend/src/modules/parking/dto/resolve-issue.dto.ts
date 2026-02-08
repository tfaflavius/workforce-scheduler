import { IsNotEmpty, IsString } from 'class-validator';

export class ResolveIssueDto {
  @IsString()
  @IsNotEmpty()
  resolutionDescription: string;
}
