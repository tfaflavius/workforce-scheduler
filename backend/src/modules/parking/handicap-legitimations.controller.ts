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
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HandicapLegitimationsService } from './handicap-legitimations.service';
import { CreateHandicapLegitimationDto } from './dto/create-handicap-legitimation.dto';
import { UpdateHandicapLegitimationDto } from './dto/update-handicap-legitimation.dto';
import { ResolveHandicapLegitimationDto } from './dto/resolve-handicap-legitimation.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { HandicapLegitimationStatus, HANDICAP_PARKING_DEPARTMENT_NAME } from './constants/parking.constants';
import { UserRole } from '../users/entities/user.entity';

@Controller('parking/handicap-legitimations')
@UseGuards(JwtAuthGuard)
export class HandicapLegitimationsController {
  constructor(private readonly legitimationsService: HandicapLegitimationsService) {}

  private checkAccess(user: any): void {
    // Doar Admin și departamentul Parcări Handicap pot accesa
    const isAdmin = user.role === UserRole.ADMIN;
    const isHandicapDepartment = user.department?.name === HANDICAP_PARKING_DEPARTMENT_NAME;

    if (!isAdmin && !isHandicapDepartment) {
      throw new ForbiddenException('Nu aveți permisiunea să accesați această resursă');
    }
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateHandicapLegitimationDto) {
    this.checkAccess(req.user);
    return this.legitimationsService.create(req.user.id, dto);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: HandicapLegitimationStatus,
  ) {
    this.checkAccess(req.user);
    return this.legitimationsService.findAll(status);
  }

  @Get('reports')
  async getForReports(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: HandicapLegitimationStatus,
  ) {
    // Doar adminii pot accesa rapoartele
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot accesa rapoartele');
    }

    return this.legitimationsService.findForReports({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    });
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    this.checkAccess(req.user);
    return this.legitimationsService.findOne(id);
  }

  @Get(':id/history')
  async getHistory(@Request() req, @Param('id') id: string) {
    this.checkAccess(req.user);
    return this.legitimationsService.getHistory(id);
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateHandicapLegitimationDto,
  ) {
    this.checkAccess(req.user);
    return this.legitimationsService.update(id, req.user.id, dto, req.user);
  }

  @Post(':id/resolve')
  async resolve(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ResolveHandicapLegitimationDto,
  ) {
    this.checkAccess(req.user);
    return this.legitimationsService.resolve(id, req.user.id, dto);
  }

  @Get(':id/comments')
  async getComments(@Request() req, @Param('id') id: string) {
    this.checkAccess(req.user);
    return this.legitimationsService.getComments(id);
  }

  @Post(':id/comments')
  async addComment(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    this.checkAccess(req.user);
    return this.legitimationsService.addComment(id, req.user.id, dto);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    this.checkAccess(req.user);
    return this.legitimationsService.delete(id, req.user);
  }
}
