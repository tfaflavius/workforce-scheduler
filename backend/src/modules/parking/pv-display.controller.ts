import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PvDisplayAccessGuard } from './guards/pv-display-access.guard';
import { PvDisplayService } from './pv-display.service';
import { CreatePvDisplaySessionDto } from './dto/create-pv-display-session.dto';
import { UpdatePvDisplaySessionDto } from './dto/update-pv-display-session.dto';
import { CompletePvDisplayDayDto } from './dto/complete-pv-display-day.dto';
import { AdminAssignPvDayDto } from './dto/admin-assign-pv-day.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PvSessionStatus } from './constants/parking.constants';

@Controller('pv-display')
@UseGuards(JwtAuthGuard, PvDisplayAccessGuard)
export class PvDisplayController {
  constructor(private readonly pvDisplayService: PvDisplayService) {}

  // ===== SESSIONS =====

  @Post('sessions')
  async createSession(@Request() req, @Body() dto: CreatePvDisplaySessionDto) {
    return this.pvDisplayService.createSession(req.user.id, dto, req.user);
  }

  @Get('sessions')
  async findAllSessions(@Query('status') status?: PvSessionStatus) {
    return this.pvDisplayService.findAllSessions(status);
  }

  @Get('sessions/:id')
  async findOneSession(@Param('id') id: string) {
    return this.pvDisplayService.findOneSession(id);
  }

  @Patch('sessions/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateSession(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdatePvDisplaySessionDto,
  ) {
    return this.pvDisplayService.updateSession(id, req.user.id, dto, req.user);
  }

  @Delete('sessions/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteSession(@Param('id') id: string, @Request() req) {
    return this.pvDisplayService.deleteSession(id, req.user.id, req.user);
  }

  @Get('sessions/:id/history')
  async getSessionHistory(@Param('id') id: string) {
    return this.pvDisplayService.getSessionHistory(id);
  }

  @Get('sessions/:id/comments')
  async getComments(@Param('id') id: string) {
    return this.pvDisplayService.getComments(id);
  }

  @Post('sessions/:id/comments')
  async addComment(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: CreateCommentDto,
  ) {
    return this.pvDisplayService.addComment(id, req.user.id, dto);
  }

  // ===== MARKETPLACE (Days) =====

  @Get('days/available')
  async getAvailableDays() {
    return this.pvDisplayService.getAvailableDays();
  }

  @Get('days/my-claimed')
  async getMyClaimedDays(@Request() req) {
    return this.pvDisplayService.getMyClaimedDays(req.user.id);
  }

  @Get('days/:id')
  async findOneDay(@Param('id') id: string) {
    return this.pvDisplayService.findOneDay(id);
  }

  @Get('days/:id/history')
  async getDayHistory(@Param('id') id: string) {
    return this.pvDisplayService.getDayHistory(id);
  }

  @Post('days/:id/claim')
  async claimDay(@Param('id') id: string, @Request() req) {
    return this.pvDisplayService.claimDay(id, req.user.id, req.user);
  }

  @Post('days/:id/unclaim')
  async unclaimDay(@Param('id') id: string, @Request() req) {
    return this.pvDisplayService.unclaimDay(id, req.user.id, req.user);
  }

  @Post('days/:id/complete')
  async completeDay(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: CompletePvDisplayDayDto,
  ) {
    return this.pvDisplayService.completeDay(id, req.user.id, dto, req.user);
  }

  @Post('days/:id/admin-assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminAssignDay(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: AdminAssignPvDayDto,
  ) {
    return this.pvDisplayService.adminAssignDay(id, req.user.id, dto);
  }

  // ===== CONTROL USERS (for admin picker) =====

  @Get('control-users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getControlUsers() {
    return this.pvDisplayService.getControlUsers();
  }
}
