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
      throw new NotFoundException(`Parcarea cu ID ${id} nu a fost gasita`);
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
      throw new NotFoundException(`Automatul cu ID ${id} nu a fost gasit`);
    }

    return machine;
  }

  async seedData(): Promise<{ message: string; parkingLots: number; paymentMachines: number }> {
    // Check if data already exists
    const existingLots = await this.parkingLotRepository.count();
    if (existingLots > 0) {
      return { message: 'Data already exists', parkingLots: existingLots, paymentMachines: await this.paymentMachineRepository.count() };
    }

    // Seed parking lots and payment machines
    const parkingLotsData = [
      { name: 'Parcare Baritiu', code: 'BARITIU', machines: ['631', '632'] },
      { name: 'Parcarea Doja', code: 'DOJA', machines: ['681', '682', '683'] },
      { name: 'Parcarea Brasovului', code: 'BRASOVULUI', machines: ['611', '612'] },
      { name: 'Parcarea Independentei', code: 'INDEPENDENTEI', machines: ['601', '602'] },
      { name: 'Parcarea Iosif Vulcan', code: 'IOSIF_VULCAN', machines: ['661'] },
      { name: 'Parcarea Tribunalului', code: 'TRIBUNALULUI', machines: ['651', '652'] },
      { name: 'Parcarea Spital Municipal', code: 'SPITAL_MUNICIPAL', machines: ['641'] },
      { name: 'Parcarea Cetate', code: 'CETATE', machines: ['671', '672', '673'] },
      { name: 'Parcarea Primarie', code: 'PRIMARIE', machines: ['621'] },
    ];

    let totalMachines = 0;

    for (const lotData of parkingLotsData) {
      const parkingLot = this.parkingLotRepository.create({
        name: lotData.name,
        code: lotData.code,
        isActive: true,
      });

      const savedLot = await this.parkingLotRepository.save(parkingLot);

      for (const machineNumber of lotData.machines) {
        const machine = this.paymentMachineRepository.create({
          parkingLotId: savedLot.id,
          machineNumber,
          isActive: true,
        });
        await this.paymentMachineRepository.save(machine);
        totalMachines++;
      }
    }

    return {
      message: 'Data seeded successfully',
      parkingLots: parkingLotsData.length,
      paymentMachines: totalMachines
    };
  }
}
