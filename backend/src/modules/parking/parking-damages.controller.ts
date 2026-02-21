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
import { ParkingDamagesService } from './parking-damages.service';
import { CreateParkingDamageDto } from './dto/create-parking-damage.dto';
import { ResolveDamageDto } from './dto/resolve-damage.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ParkingDamage, ParkingDamageStatus } from './entities/parking-damage.entity';
import { ParkingDamageComment } from './entities/parking-damage-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { UserRole } from '../users/entities/user.entity';

@Controller('parking-damages')
@UseGuards(JwtAuthGuard, ParkingAccessGuard)
export class ParkingDamagesController {
  constructor(private readonly parkingDamagesService: ParkingDamagesService) {}

  @Post()
  async create(
    @Request() req,
    @Body() dto: CreateParkingDamageDto,
  ): Promise<ParkingDamage> {
    return this.parkingDamagesService.create(req.user.id, dto);
  }

  @Get()
  async findAll(
    @Query('status') status?: ParkingDamageStatus,
  ): Promise<ParkingDamage[]> {
    return this.parkingDamagesService.findAll(status);
  }

  @Get('urgent')
  async findUrgent(): Promise<ParkingDamage[]> {
    return this.parkingDamagesService.findUrgent();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ParkingDamage> {
    return this.parkingDamagesService.findOne(id);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string): Promise<ParkingHistory[]> {
    return this.parkingDamagesService.getHistory(id);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string): Promise<ParkingDamageComment[]> {
    return this.parkingDamagesService.getComments(id);
  }

  @Patch(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ResolveDamageDto,
  ): Promise<ParkingDamage> {
    return this.parkingDamagesService.resolve(id, req.user.id, dto);
  }

  @Patch(':id/signature')
  async addSignature(
    @Param('id') id: string,
    @Request() req,
    @Body('signatureData') signatureData: string,
  ): Promise<ParkingDamage> {
    return this.parkingDamagesService.addSignature(id, req.user.id, signatureData);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: CreateCommentDto,
  ): Promise<ParkingDamageComment> {
    // Accesul este verificat de ParkingAccessGuard la nivel de controller
    // Permite comentarii pentru: ADMIN, MANAGER, Dispecerat, Intretinere Parcari
    return this.parkingDamagesService.addComment(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    return this.parkingDamagesService.delete(id, req.user);
  }
}
