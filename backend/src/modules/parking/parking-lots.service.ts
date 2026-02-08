import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingLot } from './entities/parking-lot.entity';
import { PaymentMachine } from './entities/payment-machine.entity';

@Injectable()
export class ParkingLotsService {
  constructor(
    @InjectRepository(ParkingLot)
    private readonly parkingLotRepository: Repository<ParkingLot>,
    @InjectRepository(PaymentMachine)
    private readonly paymentMachineRepository: Repository<PaymentMachine>,
  ) {}

  async findAll(): Promise<ParkingLot[]> {
    return this.parkingLotRepository.find({
      where: { isActive: true },
      relations: ['paymentMachines'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ParkingLot> {
    const parkingLot = await this.parkingLotRepository.findOne({
      where: { id },
      relations: ['paymentMachines'],
    });

    if (!parkingLot) {
      throw new NotFoundException(`Parcarea cu ID ${id} nu a fost găsită`);
    }

    return parkingLot;
  }

  async findPaymentMachines(parkingLotId?: string): Promise<PaymentMachine[]> {
    const query = this.paymentMachineRepository.createQueryBuilder('machine')
      .leftJoinAndSelect('machine.parkingLot', 'parkingLot')
      .where('machine.isActive = :isActive', { isActive: true });

    if (parkingLotId) {
      query.andWhere('machine.parkingLotId = :parkingLotId', { parkingLotId });
    }

    return query.orderBy('parkingLot.name', 'ASC')
      .addOrderBy('machine.machineNumber', 'ASC')
      .getMany();
  }

  async findPaymentMachineById(id: string): Promise<PaymentMachine> {
    const machine = await this.paymentMachineRepository.findOne({
      where: { id },
      relations: ['parkingLot'],
    });

    if (!machine) {
      throw new NotFoundException(`Automatul cu ID ${id} nu a fost găsit`);
    }

    return machine;
  }
}
