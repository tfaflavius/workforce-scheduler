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
import { DomiciliuRequestsService } from './domiciliu-requests.service';
import { CreateDomiciliuRequestDto } from './dto/create-domiciliu-request.dto';
import { UpdateDomiciliuRequestDto } from './dto/update-domiciliu-request.dto';
import { ResolveDomiciliuRequestDto } from './dto/resolve-domiciliu-request.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { HandicapAccessGuard } from './guards/handicap-access.guard';
import { DomiciliuRequestStatus, DomiciliuRequestType } from './constants/parking.constants';

@Controller('parking/domiciliu-requests')
@UseGuards(JwtAuthGuard, HandicapAccessGuard)
export class DomiciliuRequestsController {
  constructor(private readonly domiciliuRequestsService: DomiciliuRequestsService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateDomiciliuRequestDto) {
    return this.domiciliuRequestsService.create(req.user.id, dto);
  }

  @Get()
  async findAll(
    @Query('status') status?: DomiciliuRequestStatus,
    @Query('type') requestType?: DomiciliuRequestType,
  ) {
    return this.domiciliuRequestsService.findAll(status, requestType);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.domiciliuRequestsService.findOne(id);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.domiciliuRequestsService.getHistory(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateDomiciliuRequestDto,
  ) {
    return this.domiciliuRequestsService.update(id, req.user.id, dto, req.user.role);
  }

  @Post(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ResolveDomiciliuRequestDto,
  ) {
    return this.domiciliuRequestsService.resolve(id, req.user.id, dto);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: CreateCommentDto,
  ) {
    return this.domiciliuRequestsService.addComment(id, req.user.id, dto);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.domiciliuRequestsService.getComments(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.domiciliuRequestsService.delete(id, req.user);
  }
}
