import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ParkingAccessGuard } from './guards/parking-access.guard';
import { ParkingLotsService } from './parking-lots.service';
import { ParkingLot } from './entities/parking-lot.entity';
import { PaymentMachine } from './entities/payment-machine.entity';
import { ParkingEquipment } from '../permissions/entities/parking-equipment.entity';
import { ContactFirm } from '../permissions/entities/contact-firm.entity';
import { EQUIPMENT_LIST, DAMAGE_EQUIPMENT_LIST, COMPANY_LIST } from './constants/parking.constants';

@Controller('parking-lots')
@UseGuards(JwtAuthGuard, RolesGuard, ParkingAccessGuard)
export class ParkingLotsController {
  constructor(
    private readonly parkingLotsService: ParkingLotsService,
    @InjectRepository(ParkingEquipment)
    private readonly equipmentRepo: Repository<ParkingEquipment>,
    @InjectRepository(ContactFirm)
    private readonly contactFirmRepo: Repository<ContactFirm>,
  ) {}

  @Post('seed')
  @Roles(UserRole.ADMIN, UserRole.MASTER_ADMIN)
  async seedData(): Promise<{ message: string; parkingLots: number; paymentMachines: number }> {
    return this.parkingLotsService.seedData();
  }

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
  async getEquipmentList(): Promise<string[]> {
    const dbItems = await this.equipmentRepo.find({
      where: [{ category: 'ISSUE', isActive: true }, { category: 'BOTH', isActive: true }],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    if (dbItems.length > 0) return dbItems.map((e) => e.name);
    return [...EQUIPMENT_LIST];
  }

  @Get('constants/damage-equipment')
  async getDamageEquipmentList(): Promise<string[]> {
    const dbItems = await this.equipmentRepo.find({
      where: [{ category: 'DAMAGE', isActive: true }, { category: 'BOTH', isActive: true }],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    if (dbItems.length > 0) return dbItems.map((e) => e.name);
    return [...DAMAGE_EQUIPMENT_LIST];
  }

  @Get('constants/companies')
  async getCompanyList(): Promise<string[]> {
    const dbItems = await this.contactFirmRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    if (dbItems.length > 0) return dbItems.map((f) => f.name);
    return [...COMPANY_LIST];
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ParkingLot> {
    return this.parkingLotsService.findOne(id);
  }
}
