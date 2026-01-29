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
import { StartTimerDto } from './dto/start-timer.dto';
import { RecordLocationDto } from './dto/record-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('time-tracking')
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

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
