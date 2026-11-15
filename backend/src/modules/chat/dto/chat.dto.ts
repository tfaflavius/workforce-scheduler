import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  /** Doar in grupurile de departament: catre ce departamente se trimite. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  targetDepartmentIds?: string[];

  /** Raspuns la un mesaj anume (optional). */
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}

export class StartDirectChatDto {
  @IsUUID()
  userId: string;
}

export class ToggleReactionDto {
  /** Conversatia in care omul vede mesajul (pentru verificarea accesului) */
  @IsUUID()
  conversationId: string;

  @IsString()
  @MaxLength(16)
  emoji: string;
}
