import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { GeocodingService } from './geocoding.service';
import { StartTimerDto } from './dto/start-timer.dto';
import { RecordLocationDto } from './dto/record-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('time-tracking')
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  constructor(
    private readonly timeTrackingService: TimeTrackingService,
    private readonly geocodingService: GeocodingService,
  ) {}

  // ===== ADMIN ENDPOINTS (before parametric routes) =====

  @Get('admin/active')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminActiveTimers() {
    return this.timeTrackingService.getAdminActiveTimers();
  }

  @Get('admin/entries')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminAllEntries(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ) {
    const filters = {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(userId && { userId }),
    };
    return this.timeTrackingService.getAdminAllEntries(filters);
  }

  @Get('admin/users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminDepartmentUsers() {
    return this.timeTrackingService.getAdminDepartmentUsers();
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminStats() {
    return this.timeTrackingService.getAdminStats();
  }

  @Get('admin/entries/:id/locations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminLocationLogs(@Param('id') id: string) {
    return this.timeTrackingService.getAdminLocationLogs(id);
  }

  @Get('admin/entries/:id/route')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminEntryRoute(@Param('id') id: string) {
    return this.timeTrackingService.getAdminEntryRoute(id);
  }

  @Post('admin/entries/:id/geocode')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  geocodeEntryLocations(@Param('id') id: string) {
    return this.geocodingService.geocodeTimeEntryLocations(id);
  }

  @Post('admin/request-locations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  requestInstantLocations() {
    return this.timeTrackingService.triggerInstantGpsCapture();
  }

  // ===== USER ENDPOINTS =====

  @Post('start')
  startTimer(@Body() startTimerDto: StartTimerDto, @Request() req) {
    return this.timeTrackingService.startTimer(req.user.id, startTimerDto);
  }

  @Post(':id/stop')
  stopTimer(@Param('id') id: string, @Request() req) {
    return this.timeTrackingService.stopTimer(req.user.id, id);
  }

  @Get('active')
  getActiveTimer(@Request() req) {
    return this.timeTrackingService.getActiveTimer(req.user.id);
  }

  @Get('entries')
  getTimeEntries(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('taskId') taskId?: string,
  ) {
    const filters = {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(taskId && { taskId }),
    };

    return this.timeTrackingService.getTimeEntries(req.user.id, filters);
  }

  @Post('location')
  recordLocation(@Body() recordLocationDto: RecordLocationDto, @Request() req) {
    return this.timeTrackingService.recordLocation(req.user.id, recordLocationDto);
  }

  @Get(':id/locations')
  getLocationHistory(@Param('id') id: string, @Request() req) {
    return this.timeTrackingService.getLocationHistory(req.user.id, id);
  }
}
