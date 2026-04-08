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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EquipmentStockAccessGuard } from './guards/equipment-stock-access.guard';
import { EquipmentStockService } from './equipment-stock.service';
import { CreateStockDefinitionDto } from './dto/create-stock-definition.dto';
import { UpdateStockDefinitionDto } from './dto/update-stock-definition.dto';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';
import { StockCategory } from './constants/equipment-stock.constants';

@ApiTags('Equipment Stock')
@ApiBearerAuth('JWT')
@Controller('equipment-stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentStockController {
  constructor(private readonly equipmentStockService: EquipmentStockService) {}

  // ===== DEFINITIONS =====

  @Get('definitions')
  @Roles(UserRole.USER)
  async findAllDefinitions(@Query('category') category?: string) {
    return this.equipmentStockService.findAllDefinitions(category);
  }

  @Post('definitions')
  @Roles(UserRole.MASTER_ADMIN)
  async createDefinition(
    @Request() req,
    @Body() dto: CreateStockDefinitionDto,
  ) {
    return this.equipmentStockService.createDefinition(dto, req.user.id);
  }

  @Patch('definitions/:id')
  @Roles(UserRole.MASTER_ADMIN)
  async updateDefinition(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateStockDefinitionDto,
  ) {
    return this.equipmentStockService.updateDefinition(id, dto, req.user.id);
  }

  @Delete('definitions/:id')
  @Roles(UserRole.MASTER_ADMIN)
  async deleteDefinition(@Param('id') id: string, @Request() req) {
    return this.equipmentStockService.deleteDefinition(id, req.user.id);
  }

  // ===== ENTRIES =====

  @Get('entries')
  @UseGuards(EquipmentStockAccessGuard)
  async findEntriesByCategory(
    @Query('category') category: StockCategory,
    @Query('search') search?: string,
  ) {
    return this.equipmentStockService.findEntriesByCategory(category, search);
  }

  @Post('entries')
  @UseGuards(EquipmentStockAccessGuard)
  async createEntry(@Request() req, @Body() dto: CreateStockEntryDto) {
    return this.equipmentStockService.createEntry(dto, req.user.id);
  }

  @Patch('entries/:id')
  @UseGuards(EquipmentStockAccessGuard)
  async updateEntry(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateStockEntryDto,
  ) {
    return this.equipmentStockService.updateEntry(id, dto, req.user.id);
  }

  @Delete('entries/:id')
  @Roles(UserRole.ADMIN)
  async deleteEntry(@Param('id') id: string, @Request() req) {
    return this.equipmentStockService.deleteEntry(id, req.user.id);
  }
}
