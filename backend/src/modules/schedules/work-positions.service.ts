import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkPosition } from './entities/work-position.entity';
import { CreateWorkPositionDto, UpdateWorkPositionDto } from './dto/work-position.dto';

@Injectable()
export class WorkPositionsService implements OnModuleInit {
  private readonly logger = new Logger(WorkPositionsService.name);

  constructor(
    @InjectRepository(WorkPosition)
    private workPositionsRepository: Repository<WorkPosition>,
  ) {}

  // Seed default work positions on module init
  async onModuleInit() {
    await this.seedDefaultPositions();
  }

  private async seedDefaultPositions() {
    const count = await this.workPositionsRepository.count();

    if (count === 0) {
      this.logger.log('Seeding default work positions...');

      const defaultPositions = [
        {
          name: 'Dispecerat',
          shortName: 'D',
          color: '#2196F3',
          icon: 'headset',
          description: 'Poziție de dispecerat',
          displayOrder: 1,
          isActive: true,
        },
        {
          name: 'Control',
          shortName: 'C',
          color: '#4CAF50',
          icon: 'security',
          description: 'Poziție de control',
          displayOrder: 2,
          isActive: true,
        },
      ];

      for (const positionData of defaultPositions) {
        const position = this.workPositionsRepository.create(positionData);
        await this.workPositionsRepository.save(position);
        this.logger.log(`Created work position: ${position.name}`);
      }

      this.logger.log('Default work positions seeded successfully');
    } else {
      this.logger.log(`Work positions already exist (count: ${count})`);
    }
  }

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
