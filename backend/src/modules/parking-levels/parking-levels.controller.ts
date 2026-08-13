import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ParkingLevelsService } from './parking-levels.service';
import {
  CreateParkingLevelDto,
  UpdateParkingLevelDto,
} from './dto/upsert-parking-level.dto';

@ApiTags('Parking Levels')
@ApiBearerAuth('JWT')
@Controller('parking-levels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParkingLevelsController {
  constructor(private readonly service: ParkingLevelsService) {}

  // Vizualizare: orice utilizator autentificat (numere de locuri, ne-sensibil)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // Editare: Manager, Admin, Master Admin
  @Post()
  @Roles(UserRole.MANAGER)
  create(@Body() dto: CreateParkingLevelDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateParkingLevelDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
