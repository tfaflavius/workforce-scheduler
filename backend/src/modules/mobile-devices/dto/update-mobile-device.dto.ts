import { PartialType } from '@nestjs/swagger';
import { CreateMobileDeviceDto } from './create-mobile-device.dto';

export class UpdateMobileDeviceDto extends PartialType(CreateMobileDeviceDto) {}
