import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ControlSesizareAccessGuard } from './guards/control-sesizare-access.guard';
import { ControlSesizariService } from './control-sesizari.service';
import { CreateControlSesizareDto } from './dto/create-control-sesizare.dto';
import { UpdateControlSesizareDto } from './dto/update-control-sesizare.dto';
import { ResolveControlSesizareDto } from './dto/resolve-control-sesizare.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ControlSesizare } from './entities/control-sesizare.entity';
import { ControlSesizareComment } from './entities/control-sesizare-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { UserRole } from '../users/entities/user.entity';
import { ControlSesizareStatus, ControlSesizareType } from './constants/parking.constants';

@Controller('control-sesizari')
@UseGuards(JwtAuthGuard, ControlSesizareAccessGuard)
export class ControlSesizariController {
  constructor(private readonly controlSesizariService: ControlSesizariService) {}

  @Post()
  async create(
    @Request() req,
    @Body() dto: CreateControlSesizareDto,
  ): Promise<ControlSesizare> {
    return this.controlSesizariService.create(req.user.id, dto);
  }

  @Get()
  async findAll(
    @Query('status') status?: ControlSesizareStatus,
    @Query('type') type?: ControlSesizareType,
  ): Promise<ControlSesizare[]> {
    return this.controlSesizariService.findAll(status, type);
  }

  // IMPORTANT: Ruta statica 'reports/export' trebuie sa fie INAINTE de ':id' parametric
  @Get('reports/export')
  async findForReports(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: ControlSesizareStatus,
    @Query('type') type?: ControlSesizareType,
  ): Promise<ControlSesizare[]> {
    return this.controlSesizariService.findForReports({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      type,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ControlSesizare> {
    return this.controlSesizariService.findOne(id);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string): Promise<ParkingHistory[]> {
    return this.controlSesizariService.getHistory(id);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string): Promise<ControlSesizareComment[]> {
    return this.controlSesizariService.getComments(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateControlSesizareDto,
  ): Promise<ControlSesizare> {
    return this.controlSesizariService.update(id, req.user.id, dto, req.user);
  }

  @Patch(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ResolveControlSesizareDto,
  ): Promise<ControlSesizare> {
    return this.controlSesizariService.resolve(id, req.user.id, dto);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: CreateCommentDto,
  ): Promise<ControlSesizareComment> {
    return this.controlSesizariService.addComment(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    return this.controlSesizariService.delete(id, req.user);
  }
}
