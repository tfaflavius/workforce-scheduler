import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { EquipmentStockDefinition } from './entities/equipment-stock-definition.entity';
import { EquipmentStockEntry } from './entities/equipment-stock-entry.entity';
import { ParkingHistory } from '../parking/entities/parking-history.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';

// Service
import { EquipmentStockService } from './equipment-stock.service';

// Controller
import { EquipmentStockController } from './equipment-stock.controller';

// Guard
import { EquipmentStockAccessGuard } from './guards/equipment-stock-access.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EquipmentStockDefinition,
      EquipmentStockEntry,
      ParkingHistory,
      User,
      Department,
    ]),
  ],
  controllers: [EquipmentStockController],
  providers: [EquipmentStockService, EquipmentStockAccessGuard],
  exports: [EquipmentStockService],
})
export class EquipmentStockModule {}
