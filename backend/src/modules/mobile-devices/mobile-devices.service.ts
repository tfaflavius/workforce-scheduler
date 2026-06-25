import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MobileDevice } from './entities/mobile-device.entity';
import { CreateMobileDeviceDto } from './dto/create-mobile-device.dto';
import { UpdateMobileDeviceDto } from './dto/update-mobile-device.dto';

@Injectable()
export class MobileDevicesService {
  private readonly logger = new Logger(MobileDevicesService.name);

  constructor(
    @InjectRepository(MobileDevice)
    private readonly deviceRepository: Repository<MobileDevice>,
  ) {}

  async findAll(search?: string): Promise<MobileDevice[]> {
    const qb = this.deviceRepository
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.assignedUser', 'assignedUser')
      .orderBy('device.deviceType', 'ASC')
      .addOrderBy('device.model', 'ASC');

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.where(
        `(LOWER(device.device_type) LIKE :term
          OR LOWER(device.model) LIKE :term
          OR LOWER(COALESCE(device.serial_imei, '')) LIKE :term
          OR LOWER(COALESCE(device.sim_operator, '')) LIKE :term
          OR LOWER(COALESCE(device.sim_serial, '')) LIKE :term
          OR LOWER(COALESCE(assignedUser.full_name, '')) LIKE :term)`,
        { term },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<MobileDevice> {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: ['assignedUser'],
    });
    if (!device) {
      throw new NotFoundException('Dispozitivul nu a fost gasit');
    }
    return device;
  }

  async create(dto: CreateMobileDeviceDto, userId: string): Promise<MobileDevice> {
    const device = this.deviceRepository.create({
      deviceType: dto.deviceType,
      model: dto.model,
      serialImei: dto.serialImei ?? null,
      simOperator: dto.simOperator ?? null,
      simSerial: dto.simSerial ?? null,
      assignedUserId: dto.assignedUserId ?? null,
      notes: dto.notes ?? null,
      createdById: userId,
      lastEditedById: userId,
    });
    const saved = await this.deviceRepository.save(device);
    this.logger.log(`Mobile device created: ${saved.id} by ${userId}`);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateMobileDeviceDto, userId: string): Promise<MobileDevice> {
    const device = await this.findOne(id);

    if (dto.deviceType !== undefined) device.deviceType = dto.deviceType;
    if (dto.model !== undefined) device.model = dto.model;
    if (dto.serialImei !== undefined) device.serialImei = dto.serialImei ?? null;
    if (dto.simOperator !== undefined) device.simOperator = dto.simOperator ?? null;
    if (dto.simSerial !== undefined) device.simSerial = dto.simSerial ?? null;
    if (dto.assignedUserId !== undefined) device.assignedUserId = dto.assignedUserId ?? null;
    if (dto.notes !== undefined) device.notes = dto.notes ?? null;
    device.lastEditedById = userId;

    await this.deviceRepository.save(device);
    this.logger.log(`Mobile device updated: ${id} by ${userId}`);
    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<{ deleted: true }> {
    const device = await this.findOne(id);
    await this.deviceRepository.delete(device.id);
    this.logger.log(`Mobile device deleted: ${id} by ${userId}`);
    return { deleted: true };
  }
}
