import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendChatMessageDto, StartDirectChatDto } from './dto/chat.dto';

@ApiTags('Chat')
@ApiBearerAuth('JWT')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get('conversations')
  list(@Request() req) {
    return this.service.listConversations(req.user);
  }

  @Get('unread-count')
  unread(@Request() req) {
    return this.service.unreadTotal(req.user);
  }

  @Get('users')
  users(@Request() req) {
    return this.service.listUsers(req.user);
  }

  @Post('direct')
  startDirect(@Body() dto: StartDirectChatDto, @Request() req) {
    return this.service.startDirect(dto.userId, req.user);
  }

  @Get('conversations/:id/messages')
  messages(@Param('id') id: string, @Query('before') before: string, @Request() req) {
    return this.service.getMessages(id, req.user, before);
  }

  @Post('conversations/:id/messages')
  send(@Param('id') id: string, @Body() dto: SendChatMessageDto, @Request() req) {
    return this.service.sendMessage(id, dto.message, req.user);
  }

  @Delete('messages/:id')
  remove(@Param('id') id: string, @Request() req) {
    return this.service.deleteMessage(id, req.user);
  }
}
