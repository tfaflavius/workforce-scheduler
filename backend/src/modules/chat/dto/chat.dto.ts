import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;
}

export class StartDirectChatDto {
  @IsUUID()
  userId: string;
}
