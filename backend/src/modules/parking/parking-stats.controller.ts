import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ParkingStatsService } from './parking-stats.service';
import { PARKING_STAT_LOCATIONS } from './constants/parking.constants';

@Controller('parking-stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class ParkingStatsController {
  constructor(private readonly parkingStatsService: ParkingStatsService) {}

  // ==================== LOCATIONS ====================

  @Get('locations')
  getLocations() {
    return PARKING_STAT_LOCATIONS;
  }

  // ==================== DAILY TICKETS ====================

  @Post('tickets')
  async upsertDailyTickets(
    @Body() body: { date: string; entries: Array<{ locationKey: string; ticketCount: number }> },
    @Request() req,
  ) {
    return this.parkingStatsService.upsertDailyTickets(body.date, body.entries, req.user.id);
  }

  @Get('tickets')
  async getDailyTickets(@Query('date') date: string) {
    return this.parkingStatsService.getDailyTickets(date);
  }

  @Get('tickets/weekly')
  async getWeeklyTicketsSummary(@Query('weekStart') weekStart: string) {
    return this.parkingStatsService.getWeeklyTicketsSummary(weekStart);
  }

  @Get('tickets/monthly')
  async getMonthlyTicketsSummary(@Query('monthYear') monthYear: string) {
    return this.parkingStatsService.getMonthlyTicketsSummary(monthYear);
  }

  // ==================== MONTHLY SUBSCRIPTIONS ====================

  @Post('subscriptions')
  async upsertMonthlySubscriptions(
    @Body() body: { monthYear: string; entries: Array<{ locationKey: string; subscriptionCount: number }> },
    @Request() req,
  ) {
    return this.parkingStatsService.upsertMonthlySubscriptions(body.monthYear, body.entries, req.user.id);
  }

  @Get('subscriptions')
  async getMonthlySubscriptions(@Query('monthYear') monthYear: string) {
    return this.parkingStatsService.getMonthlySubscriptions(monthYear);
  }

  // ==================== WEEKLY OCCUPANCY ====================

  @Post('occupancy')
  async upsertWeeklyOccupancy(
    @Body() body: {
      weekStart: string;
      entries: Array<{ locationKey: string; minOccupancy: number; maxOccupancy: number; avgOccupancy: number }>;
    },
    @Request() req,
  ) {
    return this.parkingStatsService.upsertWeeklyOccupancy(body.weekStart, body.entries, req.user.id);
  }

  @Get('occupancy')
  async getWeeklyOccupancy(@Query('weekStart') weekStart: string) {
    return this.parkingStatsService.getWeeklyOccupancy(weekStart);
  }

  @Get('occupancy/monthly')
  async getMonthlyOccupancySummary(@Query('monthYear') monthYear: string) {
    return this.parkingStatsService.getMonthlyOccupancySummary(monthYear);
  }
}
