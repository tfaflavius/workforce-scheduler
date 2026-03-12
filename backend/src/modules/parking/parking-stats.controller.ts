import { Controller, Get, Post, Body, Query, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ParkingStatsService } from './parking-stats.service';
import { PARKING_STAT_LOCATIONS } from './constants/parking.constants';
import { HttpCacheInterceptor, CacheTTL } from '../../common/interceptors/cache.interceptor';

@ApiTags('Parking')
@ApiBearerAuth('JWT')
@Controller('parking-stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class ParkingStatsController {
  constructor(private readonly parkingStatsService: ParkingStatsService) {}

  // ==================== LOCATIONS ====================

  @Get('locations')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(300) // Cache static data for 5 minutes
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
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(120) // Cache weekly summary for 2 minutes
  async getWeeklyTicketsSummary(@Query('weekStart') weekStart: string) {
    return this.parkingStatsService.getWeeklyTicketsSummary(weekStart);
  }

  @Get('tickets/monthly')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(120) // Cache monthly summary for 2 minutes
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
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(120) // Cache monthly occupancy for 2 minutes
  async getMonthlyOccupancySummary(@Query('monthYear') monthYear: string) {
    return this.parkingStatsService.getMonthlyOccupancySummary(monthYear);
  }
}
