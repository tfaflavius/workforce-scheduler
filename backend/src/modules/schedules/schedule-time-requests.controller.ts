import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ScheduleTimeRequestsService } from './schedule-time-requests.service';
import {
  CreateScheduleTimeRequestDto,
  RespondScheduleTimeRequestDto,
} from './dto/schedule-time-request.dto';

/** Cereri de a veni la alta ora (tot 8 ore) pentru angajatii cu program fix automat. */
@Controller('schedule-time-requests')
@UseGuards(JwtAuthGuard)
export class ScheduleTimeRequestsController {
  constructor(private readonly service: ScheduleTimeRequestsService) {}

  @Get('eligibility')
  eligibility(@Request() req) {
    return this.service.eligibility(req.user.id);
  }

  @Get('my')
  my(@Request() req) {
    return this.service.my(req.user.id);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateScheduleTimeRequestDto) {
    return this.service.create(req.user.id, dto);
  }

  @Delete(':id')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.service.cancel(id, req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  list(@Request() req, @Query('status') status?: string) {
    return this.service.list(req.user.id, status);
  }

  @Patch(':id/respond')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() dto: RespondScheduleTimeRequestDto,
  ) {
    return this.service.respond(id, req.user.id, dto);
  }
}
