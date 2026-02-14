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
import { ShiftSwapsService } from './shift-swaps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { RespondSwapDto } from './dto/respond-swap.dto';
import { AdminApproveSwapDto, AdminRejectSwapDto } from './dto/admin-approve-swap.dto';
import { ShiftSwapStatus } from './entities/shift-swap-request.entity';

@Controller('shift-swaps')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftSwapsController {
  constructor(private readonly shiftSwapsService: ShiftSwapsService) {}

  /**
   * Creeaza o cerere de schimb de tura
   * Accesibil: USER, MANAGER
   */
  @Post()
  @Roles(UserRole.USER, UserRole.MANAGER)
  create(@Body() dto: CreateSwapRequestDto, @Request() req) {
    return this.shiftSwapsService.createSwapRequest(req.user.id, dto);
  }

  /**
   * Lista cererilor pentru userul curent
   * Accesibil: USER, MANAGER
   */
  @Get('my-requests')
  @Roles(UserRole.USER, UserRole.MANAGER)
  getMyRequests(@Request() req) {
    return this.shiftSwapsService.findUserSwapRequests(req.user.id);
  }

  /**
   * Lista tuturor cererilor (pentru admin)
   * Accesibil: ADMIN
   */
  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Query('status') status?: ShiftSwapStatus) {
    return this.shiftSwapsService.findAllSwapRequests({ status });
  }

  /**
   * Detalii cerere
   * Accesibil: Toti (cu verificare in service)
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftSwapsService.findOne(id);
  }

  /**
   * Gaseste userii care lucreaza intr-o data
   * Accesibil: USER, MANAGER
   */
  @Get('users-on-date/:date')
  @Roles(UserRole.USER, UserRole.MANAGER)
  getUsersOnDate(@Param('date') date: string, @Request() req) {
    return this.shiftSwapsService.findUsersWorkingOnDate(date, req.user.id);
  }

  /**
   * Raspunde la o cerere de schimb
   * Accesibil: USER, MANAGER
   */
  @Post(':id/respond')
  @Roles(UserRole.USER, UserRole.MANAGER)
  respond(
    @Param('id') id: string,
    @Body() dto: RespondSwapDto,
    @Request() req,
  ) {
    return this.shiftSwapsService.respondToSwapRequest(id, req.user.id, dto);
  }

  /**
   * Admin aproba schimbul
   * Accesibil: ADMIN
   */
  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  approve(
    @Param('id') id: string,
    @Body() dto: AdminApproveSwapDto,
    @Request() req,
  ) {
    return this.shiftSwapsService.adminApproveSwap(id, req.user.id, dto);
  }

  /**
   * Admin respinge cererea
   * Accesibil: ADMIN
   */
  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(
    @Param('id') id: string,
    @Body() dto: AdminRejectSwapDto,
    @Request() req,
  ) {
    return this.shiftSwapsService.adminRejectSwap(id, req.user.id, dto);
  }

  /**
   * Anuleaza cererea (doar solicitantul)
   * Accesibil: USER, MANAGER
   */
  @Post(':id/cancel')
  @Roles(UserRole.USER, UserRole.MANAGER)
  cancel(@Param('id') id: string, @Request() req) {
    return this.shiftSwapsService.cancelSwapRequest(id, req.user.id);
  }
}
