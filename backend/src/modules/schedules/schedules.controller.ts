import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createScheduleDto: CreateScheduleDto, @Request() req) {
    return this.schedulesService.create(req.user.id, createScheduleDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('monthYear') monthYear?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    // Pass user context for role-based filtering
    return this.schedulesService.findAll({
      monthYear,
      status,
      departmentId,
      userId: req.user.id,
      userRole: req.user.role,
    });
  }

  @Get('stats/dashboard')
  getDashboardStats() {
    return this.schedulesService.getDashboardStats();
  }

  @Get('shift-types')
  getShiftTypes() {
    return this.schedulesService.getShiftTypes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @Get(':id/validate')
  validateLaborLaw(@Param('id') id: string) {
    return this.schedulesService.validateLaborLaw(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() updateScheduleDto: UpdateScheduleDto, @Request() req) {
    return this.schedulesService.update(id, updateScheduleDto, req.user.id);
  }

  @Post(':id/submit')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  submitForApproval(@Param('id') id: string) {
    return this.schedulesService.submitForApproval(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  approve(
    @Param('id') id: string,
    @Request() req,
    @Body('notes') notes?: string,
  ) {
    return this.schedulesService.approve(id, req.user.id, notes);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(
    @Param('id') id: string,
    @Request() req,
    @Body('reason') reason: string,
  ) {
    return this.schedulesService.reject(id, req.user.id, reason);
  }

  @Post(':id/clone')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  clone(
    @Param('id') id: string,
    @Request() req,
    @Body('month') month: number,
    @Body('year') year: number,
    @Body('name') name?: string,
  ) {
    return this.schedulesService.clone(id, req.user.id, month, year, name);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string) {
    return this.schedulesService.delete(id);
  }
}
