import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PvDisplayService } from './pv-display.service';

@ApiTags('Parking')
@ApiBearerAuth('JWT')
@Controller('pv-car-status')
@UseGuards(JwtAuthGuard)
export class PvCarStatusController {
  constructor(private readonly pvDisplayService: PvDisplayService) {}

  @Get('today')
  async getCarStatusToday() {
    return this.pvDisplayService.getCarStatusToday();
  }
}
