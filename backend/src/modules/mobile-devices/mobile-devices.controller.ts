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
import { MobileDevicesAccessGuard } from './guards/mobile-devices-access.guard';
import { MobileDevicesService } from './mobile-devices.service';
import { CreateMobileDeviceDto } from './dto/create-mobile-device.dto';
import { UpdateMobileDeviceDto } from './dto/update-mobile-device.dto';

@ApiTags('Mobile Devices')
@ApiBearerAuth('JWT')
@Controller('mobile-devices')
@UseGuards(JwtAuthGuard, RolesGuard, MobileDevicesAccessGuard)
export class MobileDevicesController {
  constructor(private readonly mobileDevicesService: MobileDevicesService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.mobileDevicesService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mobileDevicesService.findOne(id);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateMobileDeviceDto) {
    return this.mobileDevicesService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdateMobileDeviceDto) {
    return this.mobileDevicesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.mobileDevicesService.remove(id, req.user.id);
  }
}
