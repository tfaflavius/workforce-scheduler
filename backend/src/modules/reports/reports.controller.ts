import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Request,
  Res,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ExportScheduleDto } from './dto/export-schedule.dto';
import { OvertimeReportFilters } from './dto/overtime-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('schedules/:id/export')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async exportSchedule(
    @Param('id') scheduleId: string,
    @Query() dto: ExportScheduleDto,
    @Request() req,
  ) {
    return this.reportsService.exportSchedule(scheduleId, req.user.id, dto);
  }

  @Get('overtime/:monthYear')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async exportOvertimeReport(
    @Param('monthYear') monthYear: string,
    @Query() filters: OvertimeReportFilters,
    @Request() req,
  ) {
    return this.reportsService.exportOvertimeReport(monthYear, req.user.id, filters);
  }

  @Get(':id/download')
  async downloadReport(@Param('id') reportId: string, @Res() res: Response) {
    const report = await this.reportsService.getReport(reportId);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.expiresAt && new Date() > report.expiresAt) {
      throw new BadRequestException('Report has expired');
    }

    // Redirect to MinIO URL
    res.redirect(report.fileUrl);
  }
}
