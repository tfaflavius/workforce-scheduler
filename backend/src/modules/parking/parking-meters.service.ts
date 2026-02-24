import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingMeter } from './entities/parking-meter.entity';
import { CreateParkingMeterDto, UpdateParkingMeterDto } from './dto/parking-meter.dto';

@Injectable()
export class ParkingMetersService {
  constructor(
    @InjectRepository(ParkingMeter)
    private readonly parkingMeterRepository: Repository<ParkingMeter>,
  ) {}

  async findAll(): Promise<ParkingMeter[]> {
    return this.parkingMeterRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async create(dto: CreateParkingMeterDto): Promise<ParkingMeter> {
    const meter = this.parkingMeterRepository.create(dto);
    return this.parkingMeterRepository.save(meter);
  }

  async update(id: string, dto: UpdateParkingMeterDto): Promise<ParkingMeter> {
    const meter = await this.parkingMeterRepository.findOne({ where: { id } });
    if (!meter) {
      throw new NotFoundException(`Parcometrul cu id ${id} nu a fost gasit`);
    }
    Object.assign(meter, dto);
    return this.parkingMeterRepository.save(meter);
  }

  async remove(id: string): Promise<void> {
    const meter = await this.parkingMeterRepository.findOne({ where: { id } });
    if (!meter) {
      throw new NotFoundException(`Parcometrul cu id ${id} nu a fost gasit`);
    }
    meter.isActive = false;
    await this.parkingMeterRepository.save(meter);
  }
}
