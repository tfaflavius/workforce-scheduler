import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { HolidayPreferencesService } from './holiday-preferences.service';
import {
  PostHolidayMessageDto,
  SaveHolidayPreferencesDto,
  UpdateHolidayPeriodDto,
} from './dto/holiday-preferences.dto';

@ApiTags('Holiday Preferences')
@ApiBearerAuth('JWT')
@Controller('holiday-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HolidayPreferencesController {
  constructor(private readonly service: HolidayPreferencesService) {}

  // Dispecerat + manager + admin (verificat in service)
  @Get('periods')
  list(@Request() req) {
    return this.service.listPeriods(req.user);
  }

  @Get('periods/:id')
  details(@Param('id') id: string, @Request() req) {
    return this.service.getPeriodDetails(id, req.user);
  }

  // Chat-ul perioadei (Dispecerat + manager + admin)
  @Get('periods/:id/messages')
  messages(@Param('id') id: string, @Request() req) {
    return this.service.listMessages(id, req.user);
  }

  @Post('periods/:id/messages')
  postMessage(@Param('id') id: string, @Body() dto: PostHolidayMessageDto, @Request() req) {
    return this.service.postMessage(id, dto.message, req.user);
  }

  @Delete('periods/:id/messages/:messageId')
  deleteMessage(@Param('id') id: string, @Param('messageId') messageId: string, @Request() req) {
    return this.service.deleteMessage(id, messageId, req.user);
  }

  // Dispecerul isi salveaza propriul rand
  @Put('periods/:id/me')
  saveMine(@Param('id') id: string, @Body() dto: SaveHolidayPreferencesDto, @Request() req) {
    return this.service.savePreferences(id, req.user.id, dto, req.user);
  }

  // Managerul / adminul modifica randul oricui
  @Put('periods/:id/users/:userId')
  @Roles(UserRole.MANAGER)
  saveForUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: SaveHolidayPreferencesDto,
    @Request() req,
  ) {
    return this.service.savePreferences(id, userId, dto, req.user);
  }

  @Patch('periods/:id')
  @Roles(UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateHolidayPeriodDto) {
    return this.service.updatePeriod(id, dto);
  }

  @Post('periods/:id/apply-schedule')
  @Roles(UserRole.MANAGER)
  applySchedule(@Param('id') id: string, @Request() req) {
    return this.service.applyToSchedule(id, req.user);
  }

  @Post('periods/:id/create-leave-requests')
  @Roles(UserRole.MANAGER)
  createLeaveRequests(@Param('id') id: string, @Request() req) {
    return this.service.createLeaveRequests(id, req.user);
  }
}
