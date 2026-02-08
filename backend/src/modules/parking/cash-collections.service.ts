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
      query.andWhere('collection.collectedAt <= :endDate', {
        endDate: filters.endDate,
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
      throw new NotFoundException(`Ridicarea cu ID ${id} nu a fost găsită`);
    }

    return collection;
  }

  async getTotals(filters?: CashCollectionFilters): Promise<CashCollectionTotals> {
    const collections = await this.findAll(filters);

    // Calculează totalul general
    const totalAmount = collections.reduce(
      (sum, c) => sum + parseFloat(c.amount.toString()),
      0
    );

    // Grupează per parcare
    const byParkingLotMap = new Map<string, { name: string; total: number; count: number }>();
    // Grupează per automat
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

  async delete(id: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot șterge ridicările');
    }

    const collection = await this.findOne(id);
    await this.cashCollectionRepository.remove(collection);
  }
}
