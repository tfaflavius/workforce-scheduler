import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingLevel } from './entities/parking-level.entity';
import {
  CreateParkingLevelDto,
  UpdateParkingLevelDto,
} from './dto/upsert-parking-level.dto';

@Injectable()
export class ParkingLevelsService {
  constructor(
    @InjectRepository(ParkingLevel)
    private readonly repo: Repository<ParkingLevel>,
  ) {}

  findAll(): Promise<ParkingLevel[]> {
    return this.repo.find({ order: { parkingOrder: 'ASC', levelOrder: 'ASC' } });
  }

  async create(dto: CreateParkingLevelDto): Promise<ParkingLevel> {
    // Daca nu se trimite parkingOrder, foloseste ordinea existenta a parcarii (sau urmatoarea)
    let parkingOrder = dto.parkingOrder;
    if (parkingOrder === undefined) {
      const existing = await this.repo.findOne({
        where: { parkingName: dto.parkingName },
        order: { parkingOrder: 'ASC' },
      });
      if (existing) {
        parkingOrder = existing.parkingOrder;
      } else {
        const max = await this.repo
          .createQueryBuilder('l')
          .select('MAX(l.parkingOrder)', 'max')
          .getRawOne<{ max: number }>();
        parkingOrder = (max?.max ?? -1) + 1;
      }
    }

    let levelOrder = dto.levelOrder;
    if (levelOrder === undefined) {
      const max = await this.repo
        .createQueryBuilder('l')
        .select('MAX(l.levelOrder)', 'max')
        .where('l.parkingName = :name', { name: dto.parkingName })
        .getRawOne<{ max: number }>();
      levelOrder = (max?.max ?? -1) + 1;
    }

    const entity = this.repo.create({
      parkingName: dto.parkingName,
      parkingOrder,
      levelOrder,
      levelNumber: dto.levelNumber ?? null,
      levelName: dto.levelName ?? null,
      total: dto.total ?? 0,
      normal: dto.normal ?? 0,
      handicap: dto.handicap ?? 0,
      mamaCopil: dto.mamaCopil ?? 0,
      electric: dto.electric ?? 0,
      rezervat: dto.rezervat ?? 0,
      moto: dto.moto ?? 0,
    });
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateParkingLevelDto): Promise<ParkingLevel> {
    const level = await this.repo.findOne({ where: { id } });
    if (!level) {
      throw new NotFoundException('Nivelul nu a fost gasit');
    }
    Object.assign(level, dto);
    return this.repo.save(level);
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const level = await this.repo.findOne({ where: { id } });
    if (!level) {
      throw new NotFoundException('Nivelul nu a fost gasit');
    }
    await this.repo.delete(id);
    return { deleted: true };
  }
}
