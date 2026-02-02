import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkPosition } from './entities/work-position.entity';
import { CreateWorkPositionDto, UpdateWorkPositionDto } from './dto/work-position.dto';

@Injectable()
export class WorkPositionsService {
  constructor(
    @InjectRepository(WorkPosition)
    private workPositionsRepository: Repository<WorkPosition>,
  ) {}

  async findAll(includeInactive = false): Promise<WorkPosition[]> {
    const query = this.workPositionsRepository.createQueryBuilder('position');

    if (!includeInactive) {
      query.where('position.is_active = :isActive', { isActive: true });
    }

    query.orderBy('position.display_order', 'ASC');

    return query.getMany();
  }

  async findOne(id: string): Promise<WorkPosition> {
    const position = await this.workPositionsRepository.findOne({
      where: { id },
    });

    if (!position) {
      throw new NotFoundException(`Work position with ID ${id} not found`);
    }

    return position;
  }

  async create(createDto: CreateWorkPositionDto): Promise<WorkPosition> {
    const position = this.workPositionsRepository.create({
      name: createDto.name,
      shortName: createDto.shortName,
      color: createDto.color || '#2196F3',
      icon: createDto.icon,
      description: createDto.description,
      displayOrder: createDto.displayOrder || 0,
      isActive: createDto.isActive ?? true,
    });

    return this.workPositionsRepository.save(position);
  }

  async update(id: string, updateDto: UpdateWorkPositionDto): Promise<WorkPosition> {
    const position = await this.findOne(id);

    if (updateDto.name !== undefined) position.name = updateDto.name;
    if (updateDto.shortName !== undefined) position.shortName = updateDto.shortName;
    if (updateDto.color !== undefined) position.color = updateDto.color;
    if (updateDto.icon !== undefined) position.icon = updateDto.icon;
    if (updateDto.description !== undefined) position.description = updateDto.description;
    if (updateDto.displayOrder !== undefined) position.displayOrder = updateDto.displayOrder;
    if (updateDto.isActive !== undefined) position.isActive = updateDto.isActive;

    return this.workPositionsRepository.save(position);
  }

  async remove(id: string): Promise<void> {
    const position = await this.findOne(id);
    await this.workPositionsRepository.remove(position);
  }

  async getDefaultPosition(): Promise<WorkPosition | null> {
    return this.workPositionsRepository.findOne({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }
}
