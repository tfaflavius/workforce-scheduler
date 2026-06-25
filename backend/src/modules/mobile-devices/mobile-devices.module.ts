import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MobileDevice } from './entities/mobile-device.entity';
import { Department } from '../departments/entities/department.entity';
import { MobileDevicesService } from './mobile-devices.service';
import { MobileDevicesController } from './mobile-devices.controller';
import { MobileDevicesAccessGuard } from './guards/mobile-devices-access.guard';

@Module({
  imports: [TypeOrmModule.forFeature([MobileDevice, Department])],
  controllers: [MobileDevicesController],
  providers: [MobileDevicesService, MobileDevicesAccessGuard],
  exports: [MobileDevicesService],
})
export class MobileDevicesModule {}
