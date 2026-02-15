import { IsString, MinLength } from 'class-validator';

export class AdminCommentDto {
  @IsString()
  @MinLength(1)
  comment: string;
}
