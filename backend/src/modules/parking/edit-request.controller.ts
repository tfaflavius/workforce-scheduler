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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EditRequestService } from './edit-request.service';
import { CreateEditRequestDto } from './dto/create-edit-request.dto';
import { ReviewEditRequestDto } from './dto/review-edit-request.dto';
import { EditRequest, EditRequestStatus } from './entities/edit-request.entity';
import { UserRole } from '../users/entities/user.entity';

@Controller('edit-requests')
@UseGuards(JwtAuthGuard)
export class EditRequestController {
  constructor(private readonly editRequestService: EditRequestService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Request() req,
    @Body() dto: CreateEditRequestDto,
  ): Promise<EditRequest> {
    return this.editRequestService.create(req.user.id, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query('status') status?: EditRequestStatus,
  ): Promise<EditRequest[]> {
    return this.editRequestService.findAll(status);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findPending(): Promise<EditRequest[]> {
    return this.editRequestService.findPending();
  }

  @Get('pending/count')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPendingCount(): Promise<{ count: number }> {
    const pending = await this.editRequestService.findPending();
    return { count: pending.length };
  }

  @Get('my-requests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getMyRequests(@Request() req): Promise<EditRequest[]> {
    return this.editRequestService.getMyRequests(req.user.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findOne(@Param('id') id: string): Promise<EditRequest> {
    return this.editRequestService.findOne(id);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async review(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ReviewEditRequestDto,
  ): Promise<EditRequest> {
    return this.editRequestService.review(id, req.user.id, dto);
  }
}
