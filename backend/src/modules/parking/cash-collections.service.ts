import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CashCollection } from './entities/cash-collection.entity';
import { CreateCashCollectionDto } from './dto/create-cash-collection.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { isAdminOrAbove } from '../../common/utils/role-hierarchy';

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

    return query.orderBy('collection.collectedAt', 'DESC').take(2000).getMany();
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
    // Construieste conditiile de filtrare o singura data
    const applyFilters = (qb: SelectQueryBuilder<CashCollection>) => {
      if (filters?.parkingLotIds?.length) {
        qb.andWhere('c.parkingLotId IN (:...parkingLotIds)', { parkingLotIds: filters.parkingLotIds });
      }
      if (filters?.paymentMachineIds?.length) {
        qb.andWhere('c.paymentMachineId IN (:...paymentMachineIds)', { paymentMachineIds: filters.paymentMachineIds });
      }
      if (filters?.startDate) {
        qb.andWhere('c.collectedAt >= :startDate', { startDate: filters.startDate });
      }
      if (filters?.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        qb.andWhere('c.collectedAt <= :endDate', { endDate: endOfDay });
      }
    };

    // 1. Total general — un singur query SQL (nu mai incarca toate entitatile)
    const totalQb = this.cashCollectionRepository.createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .addSelect('COUNT(*)::int', 'cnt');
    applyFilters(totalQb);
    const totalRow = await totalQb.getRawOne();
    const totalAmount = parseFloat(totalRow?.total) || 0;
    const count = parseInt(totalRow?.cnt) || 0;

    // 2. Grupare per parcare — GROUP BY SQL
    const lotQb = this.cashCollectionRepository.createQueryBuilder('c')
      .leftJoin('c.parkingLot', 'lot')
      .select('c.parkingLotId', 'parkingLotId')
      .addSelect('lot.name', 'parkingLotName')
      .addSelect('SUM(c.amount)', 'totalAmount')
      .addSelect('COUNT(*)::int', 'cnt')
      .groupBy('c.parkingLotId')
      .addGroupBy('lot.name');
    applyFilters(lotQb);
    const byParkingLotRows = await lotQb.getRawMany();

    // 3. Grupare per automat — GROUP BY SQL
    const machineQb = this.cashCollectionRepository.createQueryBuilder('c')
      .leftJoin('c.parkingLot', 'lot2')
      .leftJoin('c.paymentMachine', 'machine')
      .select('c.paymentMachineId', 'paymentMachineId')
      .addSelect('machine.machineNumber', 'machineNumber')
      .addSelect('lot2.name', 'parkingLotName')
      .addSelect('SUM(c.amount)', 'totalAmount')
      .addSelect('COUNT(*)::int', 'cnt')
      .groupBy('c.paymentMachineId')
      .addGroupBy('machine.machineNumber')
      .addGroupBy('lot2.name');
    applyFilters(machineQb);
    const byMachineRows = await machineQb.getRawMany();

    return {
      totalAmount,
      count,
      byParkingLot: byParkingLotRows.map(row => ({
        parkingLotId: row.parkingLotId,
        parkingLotName: row.parkingLotName || '',
        totalAmount: parseFloat(row.totalAmount) || 0,
        count: parseInt(row.cnt) || 0,
      })),
      byMachine: byMachineRows.map(row => ({
        paymentMachineId: row.paymentMachineId,
        machineNumber: row.machineNumber || '',
        parkingLotName: row.parkingLotName || '',
        totalAmount: parseFloat(row.totalAmount) || 0,
        count: parseInt(row.cnt) || 0,
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
    if (!isAdminOrAbove(user.role)) {
      throw new ForbiddenException('Doar administratorii pot sterge ridicarile');
    }

    const collection = await this.findOne(id);
    await this.cashCollectionRepository.remove(collection);
  }
}
