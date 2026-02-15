import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DailyReportsService } from './daily-reports.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import { AdminCommentDto } from './dto/admin-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('daily-reports')
@UseGuards(JwtAuthGuard)
export class DailyReportsController {
  constructor(private readonly dailyReportsService: DailyReportsService) {}

  @Post()
  create(@Body() dto: CreateDailyReportDto, @Request() req) {
    return this.dailyReportsService.create(req.user.id, dto);
  }

  @Get('today')
  getTodayReport(@Request() req) {
    return this.dailyReportsService.getTodayReport(req.user.id);
  }

  @Get('my-reports')
  getMyReports(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dailyReportsService.findMyReports(req.user.id, startDate, endDate);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getAllReports(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    if (req.user.role === UserRole.ADMIN) {
      return this.dailyReportsService.findAllForAdmin(startDate, endDate, userId, departmentId);
    }
    // Manager - rapoarte filtrate
    return this.dailyReportsService.findAllForManager(startDate, endDate);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDailyReportDto,
    @Request() req,
  ) {
    return this.dailyReportsService.update(id, req.user.id, dto);
  }

  @Patch(':id/comment')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  addComment(
    @Param('id') id: string,
    @Body() dto: AdminCommentDto,
    @Request() req,
  ) {
    return this.dailyReportsService.addAdminComment(id, req.user.id, dto);
  }
}
