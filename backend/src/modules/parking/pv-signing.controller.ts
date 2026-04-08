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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PvSigningAccessGuard } from './guards/pv-signing-access.guard';
import { PvSigningService } from './pv-signing.service';
import { CreatePvSigningSessionDto } from './dto/create-pv-signing-session.dto';
import { UpdatePvSigningSessionDto } from './dto/update-pv-signing-session.dto';
import { CompletePvSigningDayDto } from './dto/complete-pv-signing-day.dto';
import { AdminAssignPvSigningDayDto } from './dto/admin-assign-pv-signing-day.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PvSessionStatus } from './constants/parking.constants';

@ApiTags('Parking')
@ApiBearerAuth('JWT')
@Controller('pv-signing')
@UseGuards(JwtAuthGuard, PvSigningAccessGuard)
export class PvSigningController {
  constructor(private readonly pvSigningService: PvSigningService) {}

  // ===== SESSIONS =====

  @Post('sessions')
  async createSession(@Request() req, @Body() dto: CreatePvSigningSessionDto) {
    return this.pvSigningService.createSession(req.user.id, dto, req.user);
  }

  @Get('sessions')
  async findAllSessions(@Query('status') status?: PvSessionStatus) {
    return this.pvSigningService.findAllSessions(status);
  }

  @Get('sessions/:id')
  async findOneSession(@Param('id') id: string) {
    return this.pvSigningService.findOneSession(id);
  }

  @Patch('sessions/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateSession(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdatePvSigningSessionDto,
  ) {
    return this.pvSigningService.updateSession(id, req.user.id, dto, req.user);
  }

  @Delete('sessions/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteSession(@Param('id') id: string, @Request() req) {
    return this.pvSigningService.deleteSession(id, req.user.id, req.user);
  }

  @Get('sessions/:id/history')
  async getSessionHistory(@Param('id') id: string) {
    return this.pvSigningService.getSessionHistory(id);
  }

  @Get('sessions/:id/comments')
  async getComments(@Param('id') id: string) {
    return this.pvSigningService.getComments(id);
  }

  @Post('sessions/:id/comments')
  async addComment(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: CreateCommentDto,
  ) {
    return this.pvSigningService.addComment(id, req.user.id, dto);
  }

  // ===== MARKETPLACE (Days) =====

  @Get('days/available')
  async getAvailableDays() {
    return this.pvSigningService.getAvailableDays();
  }

  @Get('days/my-claimed')
  async getMyClaimedDays(@Request() req) {
    return this.pvSigningService.getMyClaimedDays(req.user.id);
  }

  @Get('days/:id')
  async findOneDay(@Param('id') id: string) {
    return this.pvSigningService.findOneDay(id);
  }

  @Get('days/:id/history')
  async getDayHistory(@Param('id') id: string) {
    return this.pvSigningService.getDayHistory(id);
  }

  @Post('days/:id/claim')
  async claimDay(@Param('id') id: string, @Request() req) {
    return this.pvSigningService.claimDay(id, req.user.id, req.user);
  }

  @Post('days/:id/unclaim')
  async unclaimDay(@Param('id') id: string, @Request() req) {
    return this.pvSigningService.unclaimDay(id, req.user.id, req.user);
  }

  @Post('days/:id/complete')
  async completeDay(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: CompletePvSigningDayDto,
  ) {
    return this.pvSigningService.completeDay(id, req.user.id, dto, req.user);
  }

  @Post('days/:id/admin-assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminAssignDay(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: AdminAssignPvSigningDayDto,
  ) {
    return this.pvSigningService.adminAssignDay(id, req.user.id, dto);
  }

  // ===== MAINTENANCE USERS (for admin picker) =====

  @Get('maintenance-users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMaintenanceUsers() {
    return this.pvSigningService.getMaintenanceUsers();
  }
}
