import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface PushSubscriptionBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Get()
  findAll(
    @Request() req,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAllForUser(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Post('mark-all-read')
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req) {
    return this.notificationsService.delete(id, req.user.id);
  }

  @Delete('read/all')
  deleteAllRead(@Request() req) {
    return this.notificationsService.deleteAllRead(req.user.id);
  }

  // Push Notification Endpoints
  @Get('push/vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.pushNotificationService.getVapidPublicKey() };
  }

  @Post('push/subscribe')
  subscribeToPush(@Request() req, @Body() subscription: PushSubscriptionBody) {
    return this.pushNotificationService.subscribe(req.user.id, subscription);
  }

  @Post('push/unsubscribe')
  unsubscribeFromPush(@Body('endpoint') endpoint: string) {
    return this.pushNotificationService.unsubscribe(endpoint);
  }

  @Get('push/status')
  async getPushStatus(@Request() req) {
    const hasSubscription = await this.pushNotificationService.hasSubscription(req.user.id);
    return { subscribed: hasSubscription };
  }

  @Post('push/test')
  async testPush(@Request() req) {
    await this.pushNotificationService.sendToUser(
      req.user.id,
      '🔔 Test Notificare',
      'Notificările push funcționează corect!',
      { url: '/dashboard' },
    );
    return { success: true, message: 'Test notification sent' };
  }
}
