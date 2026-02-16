import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcquisitionsController } from './acquisitions.controller';
import { AcquisitionsService } from './acquisitions.service';
import { BudgetPosition } from './entities/budget-position.entity';
import { Acquisition } from './entities/acquisition.entity';
import { AcquisitionInvoice } from './entities/acquisition-invoice.entity';
import { RevenueCategory } from './entities/revenue-category.entity';
import { MonthlyRevenue } from './entities/monthly-revenue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetPosition,
      Acquisition,
      AcquisitionInvoice,
      RevenueCategory,
      MonthlyRevenue,
    ]),
  ],
  controllers: [AcquisitionsController],
  providers: [AcquisitionsService],
  exports: [AcquisitionsService],
})
export class AcquisitionsModule {}
