import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingLevel } from './entities/parking-level.entity';
import { ParkingLevelsService } from './parking-levels.service';
import { ParkingLevelsController } from './parking-levels.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingLevel])],
  controllers: [ParkingLevelsController],
  providers: [ParkingLevelsService],
})
export class ParkingLevelsModule {}
