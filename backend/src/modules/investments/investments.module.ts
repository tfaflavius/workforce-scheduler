import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentDocument } from './entities/investment-document.entity';
import { InvestmentAnnualBudget } from './entities/investment-annual-budget.entity';
import { BudgetPosition } from '../acquisitions/entities/budget-position.entity';
import { InvestmentsService } from './investments.service';
import { InvestmentsController } from './investments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvestmentDocument, InvestmentAnnualBudget, BudgetPosition]),
  ],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
