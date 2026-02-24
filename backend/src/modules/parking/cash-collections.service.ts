import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashCollection } from './entities/cash-collection.entity';
import { CreateCashCollectionDto } from './dto/create-cash-collection.dto';
import { User, UserRole } from '../users/entities/user.entity';

export interface CashCollectionTotals {
  totalAmount: number;
  count: number;
  byParkingLot: {
    parkingLotId: string;
    parkingLotName: string;
    totalAmount: number;
    count: number;
  }[];
  byMachine: {
    paymentMachineId: string;
    machineNumber: string;
    parkingLotName: string;
    totalAmount: number;
    count: number;
  }[];
}

export interface CashCollectionFilters {
  parkingLotIds?: string[];
  paymentMachineIds?: string[];
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class CashCollectionsService {
  constructor(
    @InjectRepository(CashCollection)
    private readonly cashCollectionRepository: Repository<CashCollection>,
  ) {}

  async create(userId: string, dto: CreateCashCollectionDto): Promise<CashCollection> {
    const collection = this.cashCollectionRepository.create({
      ...dto,
      collectedBy: userId,
      collectedAt: new Date(),
    });

    const savedCollection = await this.cashCollectionRepository.save(collection);
    return this.findOne(savedCollection.id);
  }

  async findAll(filters?: CashCollectionFilters): Promise<CashCollection[]> {
    const query = this.cashCollectionRepository.createQueryBuilder('collection')
      .leftJoinAndSelect('collection.parkingLot', 'parkingLot')
      .leftJoinAndSelect('collection.paymentMachine', 'paymentMachine')
      .leftJoinAndSelect('collection.collector', 'collector');

    if (filters?.parkingLotIds?.length) {
      query.andWhere('collection.parkingLotId IN (:...parkingLotIds)', {
        parkingLotIds: filters.parkingLotIds,
      });
    }

    if (filters?.paymentMachineIds?.length) {
      query.andWhere('collection.paymentMachineId IN (:...paymentMachineIds)', {
        paymentMachineIds: filters.paymentMachineIds,
      });
    }

    if (filters?.startDate) {
      query.andWhere('collection.collectedAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.andWhere('collection.collectedAt <= :endDate', {
        endDate: endOfDay,
      });
    }

    return query.orderBy('collection.collectedAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<CashCollection> {
    const collection = await this.cashCollectionRepository.findOne({
      where: { id },
      relations: ['parkingLot', 'paymentMachine', 'collector'],
    });

    if (!collection) {
      throw new NotFoundException(`Ridicarea cu ID ${id} nu a fost gasita`);
    }

    return collection;
  }

  async getTotals(filters?: CashCollectionFilters): Promise<CashCollectionTotals> {
    const collections = await this.findAll(filters);

    // Calculeaza totalul general
    const totalAmount = collections.reduce(
      (sum, c) => sum + parseFloat(c.amount.toString()),
      0
    );

    // Grupeaza per parcare
    const byParkingLotMap = new Map<string, { name: string; total: number; count: number }>();
    // Grupeaza per automat
    const byMachineMap = new Map<string, { number: string; parkingName: string; total: number; count: number }>();

    for (const collection of collections) {
      // Per parcare
      const lotKey = collection.parkingLotId;
      const lotData = byParkingLotMap.get(lotKey) || {
        name: collection.parkingLot?.name || '',
        total: 0,
        count: 0,
      };
      lotData.total += parseFloat(collection.amount.toString());
      lotData.count += 1;
      byParkingLotMap.set(lotKey, lotData);

      // Per automat
      const machineKey = collection.paymentMachineId;
      const machineData = byMachineMap.get(machineKey) || {
        number: collection.paymentMachine?.machineNumber || '',
        parkingName: collection.parkingLot?.name || '',
        total: 0,
        count: 0,
      };
      machineData.total += parseFloat(collection.amount.toString());
      machineData.count += 1;
      byMachineMap.set(machineKey, machineData);
    }

    return {
      totalAmount,
      count: collections.length,
      byParkingLot: Array.from(byParkingLotMap.entries()).map(([id, data]) => ({
        parkingLotId: id,
        parkingLotName: data.name,
        totalAmount: data.total,
        count: data.count,
      })),
      byMachine: Array.from(byMachineMap.entries()).map(([id, data]) => ({
        paymentMachineId: id,
        machineNumber: data.number,
        parkingLotName: data.parkingName,
        totalAmount: data.total,
        count: data.count,
      })),
    };
  }

  /**
   * Returneaza totalurile cash agregate per parkingLot si per luna pentru un an intreg.
   * Rezultat: { [parkingLotId]: { [month]: totalAmount } }
   * Un singur query SQL optimizat.
   */
  async getCashTotalsByLotAndMonth(
    parkingLotIds: string[],
    year: number,
  ): Promise<Record<string, Record<number, number>>> {
    if (!parkingLotIds.length) return {};

    const rows = await this.cashCollectionRepository
      .createQueryBuilder('c')
      .select('c.parking_lot_id', 'parkingLotId')
      .addSelect('EXTRACT(MONTH FROM c.collected_at)::int', 'month')
      .addSelect('SUM(c.amount)', 'total')
      .where('c.parking_lot_id IN (:...ids)', { ids: parkingLotIds })
      .andWhere('EXTRACT(YEAR FROM c.collected_at) = :year', { year })
      .groupBy('c.parking_lot_id')
      .addGroupBy('EXTRACT(MONTH FROM c.collected_at)')
      .getRawMany();

    const result: Record<string, Record<number, number>> = {};
    for (const row of rows) {
      const lotId = row.parkingLotId;
      const month = Number(row.month);
      const total = parseFloat(row.total) || 0;
      if (!result[lotId]) result[lotId] = {};
      result[lotId][month] = total;
    }
    return result;
  }

  async delete(id: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot sterge ridicarile');
    }

    const collection = await this.findOne(id);
    await this.cashCollectionRepository.remove(collection);
  }
}
