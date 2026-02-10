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
import { HandicapAccessGuard } from './guards/handicap-access.guard';
import { HandicapRequestsService } from './handicap-requests.service';
import { CreateHandicapRequestDto } from './dto/create-handicap-request.dto';
import { UpdateHandicapRequestDto } from './dto/update-handicap-request.dto';
import { ResolveHandicapRequestDto } from './dto/resolve-handicap-request.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { HandicapRequest } from './entities/handicap-request.entity';
import { HandicapRequestComment } from './entities/handicap-request-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { UserRole } from '../users/entities/user.entity';
import { HandicapRequestType, HandicapRequestStatus } from './constants/parking.constants';

@Controller('handicap-requests')
@UseGuards(JwtAuthGuard, HandicapAccessGuard)
export class HandicapRequestsController {
  constructor(private readonly handicapRequestsService: HandicapRequestsService) {}

  @Post()
  async create(
    @Request() req,
    @Body() dto: CreateHandicapRequestDto,
  ): Promise<HandicapRequest> {
    return this.handicapRequestsService.create(req.user.id, dto);
  }

  @Get()
  async findAll(
    @Query('status') status?: HandicapRequestStatus,
    @Query('type') requestType?: HandicapRequestType,
  ): Promise<HandicapRequest[]> {
    return this.handicapRequestsService.findAll(status, requestType);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<HandicapRequest> {
    return this.handicapRequestsService.findOne(id);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string): Promise<ParkingHistory[]> {
    return this.handicapRequestsService.getHistory(id);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string): Promise<HandicapRequestComment[]> {
    return this.handicapRequestsService.getComments(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateHandicapRequestDto,
  ): Promise<HandicapRequest> {
    return this.handicapRequestsService.update(id, req.user.id, dto, req.user.role);
  }

  @Patch(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ResolveHandicapRequestDto,
  ): Promise<HandicapRequest> {
    return this.handicapRequestsService.resolve(id, req.user.id, dto);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: CreateCommentDto,
  ): Promise<HandicapRequestComment> {
    return this.handicapRequestsService.addComment(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    return this.handicapRequestsService.delete(id, req.user);
  }

  // Endpoint pentru rapoarte
  @Get('reports/export')
  async findForReports(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: HandicapRequestStatus,
    @Query('type') requestType?: HandicapRequestType,
  ): Promise<HandicapRequest[]> {
    return this.handicapRequestsService.findForReports({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      requestType,
    });
  }
}
