import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentStockDefinition } from './entities/equipment-stock-definition.entity';
import { EquipmentStockEntry } from './entities/equipment-stock-entry.entity';
import { ParkingHistory } from '../parking/entities/parking-history.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { isAdminOrAbove } from '../../common/utils/role-hierarchy';
import { CreateStockDefinitionDto } from './dto/create-stock-definition.dto';
import { UpdateStockDefinitionDto } from './dto/update-stock-definition.dto';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';
import { StockCategory } from './constants/equipment-stock.constants';

@Injectable()
export class EquipmentStockService {
  private readonly logger = new Logger(EquipmentStockService.name);

  constructor(
    @InjectRepository(EquipmentStockDefinition)
    private readonly definitionRepository: Repository<EquipmentStockDefinition>,
    @InjectRepository(EquipmentStockEntry)
    private readonly entryRepository: Repository<EquipmentStockEntry>,
    @InjectRepository(ParkingHistory)
    private readonly historyRepository: Repository<ParkingHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ===== DEFINITIONS =====

  async findAllDefinitions(category?: string, includeInactive?: boolean): Promise<EquipmentStockDefinition[]> {
    const qb = this.definitionRepository
      .createQueryBuilder('def');

    if (!includeInactive) {
      qb.where('def.isActive = :isActive', { isActive: true });
    }

    if (category) {
      // Returneaza definitiile din categoria specificata + cele cu categoria 'ALL'
      const method = includeInactive ? 'where' : 'andWhere';
      qb[method]('(def.category = :category OR def.category = :all)', {
        category,
        all: 'ALL',
      });
    }

    qb.orderBy('def.sortOrder', 'ASC').addOrderBy('def.name', 'ASC');

    return qb.getMany();
  }

  async createDefinition(
    dto: CreateStockDefinitionDto,
    userId: string,
  ): Promise<EquipmentStockDefinition> {
    const definition = this.definitionRepository.create({
      name: dto.name,
      category: dto.category,
      description: dto.description || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : 0,
    });

    const saved = await this.definitionRepository.save(definition);

    await this.logHistory(
      'EQUIPMENT_STOCK_DEFINITION',
      saved.id,
      'CREATED',
      userId,
      { name: dto.name, category: dto.category },
    );

    this.logger.log(`Definition created: ${saved.name} (${saved.id}) by user ${userId}`);
    return saved;
  }

  async updateDefinition(
    id: string,
    dto: UpdateStockDefinitionDto,
    userId: string,
  ): Promise<EquipmentStockDefinition> {
    const definition = await this.definitionRepository.findOne({ where: { id } });

    if (!definition) {
      throw new NotFoundException(`Definitia cu id ${id} nu a fost gasita`);
    }

    const changes: Record<string, any> = {};
    if (dto.name !== undefined && dto.name !== definition.name) {
      changes.name = { from: definition.name, to: dto.name };
    }
    if (dto.category !== undefined && dto.category !== definition.category) {
      changes.category = { from: definition.category, to: dto.category };
    }
    if (dto.description !== undefined && dto.description !== definition.description) {
      changes.description = { from: definition.description, to: dto.description };
    }
    if (dto.isActive !== undefined && dto.isActive !== definition.isActive) {
      changes.isActive = { from: definition.isActive, to: dto.isActive };
    }
    if (dto.sortOrder !== undefined && dto.sortOrder !== definition.sortOrder) {
      changes.sortOrder = { from: definition.sortOrder, to: dto.sortOrder };
    }

    Object.assign(definition, dto);
    const updated = await this.definitionRepository.save(definition);

    if (Object.keys(changes).length > 0) {
      await this.logHistory(
        'EQUIPMENT_STOCK_DEFINITION',
        id,
        'UPDATED',
        userId,
        changes,
      );
    }

    this.logger.log(`Definition updated: ${updated.name} (${id}) by user ${userId}`);
    return updated;
  }

  async deleteDefinition(id: string, userId: string): Promise<{ success: boolean }> {
    const definition = await this.definitionRepository.findOne({ where: { id } });

    if (!definition) {
      throw new NotFoundException(`Definitia cu id ${id} nu a fost gasita`);
    }

    // Soft delete - setam isActive = false
    definition.isActive = false;
    await this.definitionRepository.save(definition);

    await this.logHistory(
      'EQUIPMENT_STOCK_DEFINITION',
      id,
      'DELETED',
      userId,
      { name: definition.name },
    );

    this.logger.log(`Definition soft-deleted: ${definition.name} (${id}) by user ${userId}`);
    return { success: true };
  }

  // ===== ENTRIES =====

  async findEntriesByCategory(
    category: StockCategory,
    search?: string,
  ): Promise<EquipmentStockEntry[]> {
    const qb = this.entryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.definition', 'definition')
      .leftJoinAndSelect('entry.addedBy', 'addedBy')
      .leftJoinAndSelect('entry.lastEditedBy', 'lastEditedBy')
      .where('entry.category = :category', { category });

    if (search) {
      qb.andWhere(
        '(LOWER(definition.name) LIKE LOWER(:search) OR LOWER(entry.location) LIKE LOWER(:search) OR LOWER(entry.notes) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('definition.sortOrder', 'ASC')
      .addOrderBy('definition.name', 'ASC')
      .addOrderBy('entry.dateAdded', 'DESC');

    return qb.getMany();
  }

  async createEntry(
    dto: CreateStockEntryDto,
    userId: string,
  ): Promise<EquipmentStockEntry> {
    // Verificam ca definitia exista si e activa
    const definition = await this.definitionRepository.findOne({
      where: { id: dto.definitionId },
    });

    if (!definition) {
      throw new NotFoundException(`Definitia cu id ${dto.definitionId} nu a fost gasita`);
    }

    if (!definition.isActive) {
      throw new ForbiddenException('Nu se pot adauga inregistrari la o definitie inactiva');
    }

    // Verificam ca definitia este compatibila cu categoria
    if (definition.category !== 'ALL' && definition.category !== dto.category) {
      throw new ForbiddenException(
        `Definitia "${definition.name}" nu este disponibila pentru categoria ${dto.category}`,
      );
    }

    const entry = this.entryRepository.create({
      definitionId: dto.definitionId,
      category: dto.category,
      quantity: dto.quantity,
      location: dto.location || null,
      notes: dto.notes || null,
      dateAdded: dto.dateAdded,
      addedById: userId,
    });

    const saved = await this.entryRepository.save(entry);

    await this.logHistory(
      'EQUIPMENT_STOCK_ENTRY',
      saved.id,
      'CREATED',
      userId,
      {
        definitionName: definition.name,
        category: dto.category,
        quantity: dto.quantity,
        location: dto.location,
      },
    );

    this.logger.log(`Entry created for "${definition.name}" (${saved.id}) by user ${userId}`);

    // Returnam cu relatii
    return this.entryRepository.findOne({
      where: { id: saved.id },
      relations: ['definition', 'addedBy', 'lastEditedBy'],
    });
  }

  async updateEntry(
    id: string,
    dto: UpdateStockEntryDto,
    userId: string,
  ): Promise<EquipmentStockEntry> {
    const entry = await this.entryRepository.findOne({
      where: { id },
      relations: ['definition'],
    });

    if (!entry) {
      throw new NotFoundException(`Inregistrarea cu id ${id} nu a fost gasita`);
    }

    const changes: Record<string, any> = {};
    if (dto.quantity !== undefined && dto.quantity !== entry.quantity) {
      changes.quantity = { from: entry.quantity, to: dto.quantity };
    }
    if (dto.location !== undefined && dto.location !== entry.location) {
      changes.location = { from: entry.location, to: dto.location };
    }
    if (dto.notes !== undefined && dto.notes !== entry.notes) {
      changes.notes = { from: entry.notes, to: dto.notes };
    }
    if (dto.dateAdded !== undefined && dto.dateAdded !== entry.dateAdded) {
      changes.dateAdded = { from: entry.dateAdded, to: dto.dateAdded };
    }

    // Daca se schimba definitia, verificam compatibilitatea
    if (dto.definitionId !== undefined && dto.definitionId !== entry.definitionId) {
      const newDefinition = await this.definitionRepository.findOne({
        where: { id: dto.definitionId },
      });
      if (!newDefinition) {
        throw new NotFoundException(`Definitia cu id ${dto.definitionId} nu a fost gasita`);
      }
      if (!newDefinition.isActive) {
        throw new ForbiddenException('Nu se pot muta inregistrari la o definitie inactiva');
      }
      changes.definitionId = { from: entry.definitionId, to: dto.definitionId };
    }

    Object.assign(entry, dto);
    entry.lastEditedById = userId;

    const updated = await this.entryRepository.save(entry);

    if (Object.keys(changes).length > 0) {
      await this.logHistory(
        'EQUIPMENT_STOCK_ENTRY',
        id,
        'UPDATED',
        userId,
        changes,
      );
    }

    this.logger.log(`Entry updated (${id}) by user ${userId}`);

    return this.entryRepository.findOne({
      where: { id: updated.id },
      relations: ['definition', 'addedBy', 'lastEditedBy'],
    });
  }

  async deleteEntry(id: string, userId: string): Promise<{ success: boolean }> {
    const entry = await this.entryRepository.findOne({
      where: { id },
      relations: ['definition'],
    });

    if (!entry) {
      throw new NotFoundException(`Inregistrarea cu id ${id} nu a fost gasita`);
    }

    await this.entryRepository.remove(entry);

    await this.logHistory(
      'EQUIPMENT_STOCK_ENTRY',
      id,
      'DELETED',
      userId,
      {
        definitionName: entry.definition?.name,
        category: entry.category,
        quantity: entry.quantity,
      },
    );

    this.logger.log(`Entry deleted (${id}) by user ${userId}`);
    return { success: true };
  }

  // ===== AUDIT =====

  private async logHistory(
    entityType: string,
    entityId: string,
    action: string,
    userId: string,
    changes?: Record<string, any>,
  ): Promise<void> {
    try {
      const history = this.historyRepository.create({
        entityType: entityType as any,
        entityId,
        action: action as any,
        userId,
        changes: changes || null,
      });
      await this.historyRepository.save(history);
    } catch (error) {
      this.logger.error(`Failed to log history: ${error.message}`, error.stack);
    }
  }
}
