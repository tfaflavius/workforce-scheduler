import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcquisitionsController } from './acquisitions.controller';
import { AcquisitionsService } from './acquisitions.service';
import { BudgetPosition } from './entities/budget-position.entity';
import { Acquisition } from './entities/acquisition.entity';
import { AcquisitionInvoice } from './entities/acquisition-invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BudgetPosition, Acquisition, AcquisitionInvoice]),
  ],
  controllers: [AcquisitionsController],
  providers: [AcquisitionsService],
  exports: [AcquisitionsService],
})
export class AcquisitionsModule {}
