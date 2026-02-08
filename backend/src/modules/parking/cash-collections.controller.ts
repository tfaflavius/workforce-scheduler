import {
  Controller,
  Get,
  Post,
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
import { CashCollectionsService, CashCollectionTotals, CashCollectionFilters } from './cash-collections.service';
import { CreateCashCollectionDto } from './dto/create-cash-collection.dto';
import { CashCollection } from './entities/cash-collection.entity';
import { UserRole } from '../users/entities/user.entity';

@Controller('cash-collections')
@UseGuards(JwtAuthGuard, ParkingAccessGuard)
export class CashCollectionsController {
  constructor(private readonly cashCollectionsService: CashCollectionsService) {}

  @Post()
  async create(
    @Request() req,
    @Body() dto: CreateCashCollectionDto,
  ): Promise<CashCollection> {
    return this.cashCollectionsService.create(req.user.id, dto);
  }

  @Get()
  async findAll(
    @Query('parkingLotIds') parkingLotIds?: string,
    @Query('paymentMachineIds') paymentMachineIds?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<CashCollection[]> {
    const filters: CashCollectionFilters = {};

    if (parkingLotIds) {
      filters.parkingLotIds = parkingLotIds.split(',');
    }
    if (paymentMachineIds) {
      filters.paymentMachineIds = paymentMachineIds.split(',');
    }
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    return this.cashCollectionsService.findAll(filters);
  }

  @Get('totals')
  async getTotals(
    @Query('parkingLotIds') parkingLotIds?: string,
    @Query('paymentMachineIds') paymentMachineIds?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<CashCollectionTotals> {
    const filters: CashCollectionFilters = {};

    if (parkingLotIds) {
      filters.parkingLotIds = parkingLotIds.split(',');
    }
    if (paymentMachineIds) {
      filters.paymentMachineIds = paymentMachineIds.split(',');
    }
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    return this.cashCollectionsService.getTotals(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CashCollection> {
    return this.cashCollectionsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    return this.cashCollectionsService.delete(id, req.user);
  }
}
