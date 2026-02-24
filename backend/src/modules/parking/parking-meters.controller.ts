import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ParkingMetersService } from './parking-meters.service';
import { ParkingMeter } from './entities/parking-meter.entity';
import { CreateParkingMeterDto, UpdateParkingMeterDto } from './dto/parking-meter.dto';

@Controller('parking-meters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParkingMetersController {
  constructor(private readonly parkingMetersService: ParkingMetersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll(): Promise<ParkingMeter[]> {
    return this.parkingMetersService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateParkingMeterDto): Promise<ParkingMeter> {
    return this.parkingMetersService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateParkingMeterDto,
  ): Promise<ParkingMeter> {
    return this.parkingMetersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<void> {
    return this.parkingMetersService.remove(id);
  }
}
