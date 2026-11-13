import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatConversation, ChatMessage, ChatRead } from './entities/chat.entities';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatConversation,
      ChatMessage,
      ChatRead,
      User,
      Department,
      Notification,
    ]),
    NotificationsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
