import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AnnouncementsService } from './announcements.service';

@ApiTags('Announcements')
@ApiBearerAuth('JWT')
@Controller('admin/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  /**
   * Trimite anuntul (in-app + email) despre pontajul obligatoriu si evidenta
   * amenzilor tuturor userilor de la Control si Intretinere Parcari.
   */
  @Post('pontaj-amenzi')
  @Roles(UserRole.ADMIN, UserRole.MASTER_ADMIN)
  sendPontajAmenzi() {
    return this.announcementsService.sendPontajAmenziAnnouncement();
  }
}
