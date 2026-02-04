import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { RespondLeaveRequestDto } from './dto/respond-leave-request.dto';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { LeaveRequestStatus } from './entities/leave-request.entity';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  create(@Body() dto: CreateLeaveRequestDto, @Request() req) {
    return this.leaveRequestsService.create(req.user.id, dto);
  }

  @Get('my-requests')
  getMyRequests(@Request() req) {
    return this.leaveRequestsService.getMyRequests(req.user.id);
  }

  @Get('my-balance')
  getMyBalance(@Request() req, @Query('year') year?: string) {
    return this.leaveRequestsService.getMyBalance(
      req.user.id,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllRequests(@Query('status') status?: LeaveRequestStatus) {
    return this.leaveRequestsService.getAllRequests(status);
  }

  @Get('user/:userId/balance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getUserBalance(
    @Param('userId') userId: string,
    @Query('year') year?: string,
  ) {
    return this.leaveRequestsService.getUserBalance(
      userId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Patch('user/:userId/balance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateUserBalance(
    @Param('userId') userId: string,
    @Body() dto: UpdateLeaveBalanceDto,
    @Query('year') year?: string,
  ) {
    return this.leaveRequestsService.updateUserBalance(
      userId,
      dto,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('approved-by-month')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  getApprovedByMonth(@Query('monthYear') monthYear: string) {
    return this.leaveRequestsService.getApprovedByMonth(monthYear);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leaveRequestsService.findOne(id);
  }

  @Get(':id/overlaps')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  checkOverlaps(@Param('id') id: string) {
    return this.leaveRequestsService.checkOverlaps(id);
  }

  @Patch(':id/respond')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  respond(
    @Param('id') id: string,
    @Body() dto: RespondLeaveRequestDto,
    @Request() req,
  ) {
    return this.leaveRequestsService.respond(id, req.user.id, dto);
  }

  @Delete(':id')
  cancel(@Param('id') id: string, @Request() req) {
    return this.leaveRequestsService.cancel(id, req.user.id);
  }
}
