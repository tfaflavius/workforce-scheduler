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
import { ParkingAccessGuard } from './guards/parking-access.guard';
import { ParkingIssuesService } from './parking-issues.service';
import { CreateParkingIssueDto } from './dto/create-parking-issue.dto';
import { UpdateParkingIssueDto } from './dto/update-parking-issue.dto';
import { ResolveIssueDto } from './dto/resolve-issue.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ParkingIssue, ParkingIssueStatus } from './entities/parking-issue.entity';
import { ParkingIssueComment } from './entities/parking-issue-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { UserRole } from '../users/entities/user.entity';

@Controller('parking-issues')
@UseGuards(JwtAuthGuard, ParkingAccessGuard)
export class ParkingIssuesController {
  constructor(private readonly parkingIssuesService: ParkingIssuesService) {}

  @Post()
  async create(
    @Request() req,
    @Body() dto: CreateParkingIssueDto,
  ): Promise<ParkingIssue> {
    return this.parkingIssuesService.create(req.user.id, dto);
  }

  @Get()
  async findAll(
    @Query('status') status?: ParkingIssueStatus,
  ): Promise<ParkingIssue[]> {
    return this.parkingIssuesService.findAll(status);
  }

  @Get('urgent')
  async findUrgent(): Promise<ParkingIssue[]> {
    return this.parkingIssuesService.findUrgent();
  }

  @Get('my-assigned')
  async findMyAssigned(@Request() req): Promise<ParkingIssue[]> {
    return this.parkingIssuesService.findMyAssigned(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ParkingIssue> {
    return this.parkingIssuesService.findOne(id);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string): Promise<ParkingHistory[]> {
    return this.parkingIssuesService.getHistory(id);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string): Promise<ParkingIssueComment[]> {
    return this.parkingIssuesService.getComments(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateParkingIssueDto,
  ): Promise<ParkingIssue> {
    return this.parkingIssuesService.update(id, req.user.id, dto);
  }

  @Patch(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ResolveIssueDto,
  ): Promise<ParkingIssue> {
    return this.parkingIssuesService.resolve(id, req.user.id, dto);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: CreateCommentDto,
  ): Promise<ParkingIssueComment> {
    // Accesul este verificat de ParkingAccessGuard la nivel de controller
    // Permite comentarii pentru: ADMIN, MANAGER, Dispecerat, Intretinere Parcari
    return this.parkingIssuesService.addComment(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    return this.parkingIssuesService.delete(id, req.user);
  }
}
