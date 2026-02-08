import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParkingAccessGuard } from './guards/parking-access.guard';
import { ParkingLotsService } from './parking-lots.service';
import { ParkingLot } from './entities/parking-lot.entity';
import { PaymentMachine } from './entities/payment-machine.entity';
import { EQUIPMENT_LIST, DAMAGE_EQUIPMENT_LIST, COMPANY_LIST } from './constants/parking.constants';

@Controller('parking-lots')
@UseGuards(JwtAuthGuard, ParkingAccessGuard)
export class ParkingLotsController {
  constructor(private readonly parkingLotsService: ParkingLotsService) {}

  @Get()
  async findAll(): Promise<ParkingLot[]> {
    return this.parkingLotsService.findAll();
  }

  @Get('payment-machines')
  async findPaymentMachines(
    @Query('parkingLotId') parkingLotId?: string,
  ): Promise<PaymentMachine[]> {
    return this.parkingLotsService.findPaymentMachines(parkingLotId);
  }

  @Get('constants/equipment')
  getEquipmentList(): string[] {
    return [...EQUIPMENT_LIST];
  }

  @Get('constants/damage-equipment')
  getDamageEquipmentList(): string[] {
    return [...DAMAGE_EQUIPMENT_LIST];
  }

  @Get('constants/companies')
  getCompanyList(): string[] {
    return [...COMPANY_LIST];
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ParkingLot> {
    return this.parkingLotsService.findOne(id);
  }
}
