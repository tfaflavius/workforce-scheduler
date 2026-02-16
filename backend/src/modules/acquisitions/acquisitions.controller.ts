import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AcquisitionsService } from './acquisitions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateBudgetPositionDto, UpdateBudgetPositionDto } from './dto/create-budget-position.dto';
import { CreateAcquisitionDto, UpdateAcquisitionDto } from './dto/create-acquisition.dto';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/create-invoice.dto';
import { CreateRevenueCategoryDto, UpdateRevenueCategoryDto } from './dto/create-revenue-category.dto';
import { UpsertMonthlyRevenueDto } from './dto/create-monthly-revenue.dto';
import { BudgetCategory } from './entities/budget-position.entity';

@Controller('acquisitions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
export class AcquisitionsController {
  constructor(private readonly acquisitionsService: AcquisitionsService) {}

  // ===================== BUDGET POSITIONS =====================

  @Get('budget-positions')
  findAllBudgetPositions(
    @Query('year') year?: string,
    @Query('category') category?: BudgetCategory,
    @Request() req?,
  ) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.findAllBudgetPositions({
      year: year ? parseInt(year, 10) : undefined,
      category: category || undefined,
    });
  }

  @Get('budget-positions/:id')
  findOneBudgetPosition(@Param('id') id: string, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.findOneBudgetPosition(id);
  }

  @Post('budget-positions')
  createBudgetPosition(@Body() dto: CreateBudgetPositionDto, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.createBudgetPosition(dto);
  }

  @Put('budget-positions/:id')
  updateBudgetPosition(@Param('id') id: string, @Body() dto: UpdateBudgetPositionDto, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.updateBudgetPosition(id, dto);
  }

  @Delete('budget-positions/:id')
  deleteBudgetPosition(@Param('id') id: string, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.deleteBudgetPosition(id);
  }

  // ===================== ACQUISITIONS =====================

  @Get('acquisitions/:id')
  findOneAcquisition(@Param('id') id: string, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.findOneAcquisition(id);
  }

  @Post('acquisitions')
  createAcquisition(@Body() dto: CreateAcquisitionDto, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.createAcquisition(dto);
  }

  @Put('acquisitions/:id')
  updateAcquisition(@Param('id') id: string, @Body() dto: UpdateAcquisitionDto, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.updateAcquisition(id, dto);
  }

  @Delete('acquisitions/:id')
  deleteAcquisition(@Param('id') id: string, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.deleteAcquisition(id);
  }

  // ===================== INVOICES =====================

  @Post('invoices')
  createInvoice(@Body() dto: CreateInvoiceDto, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.createInvoice(dto);
  }

  @Put('invoices/:id')
  updateInvoice(@Param('id') id: string, @Body() dto: UpdateInvoiceDto, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.updateInvoice(id, dto);
  }

  @Delete('invoices/:id')
  deleteInvoice(@Param('id') id: string, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.deleteInvoice(id);
  }

  // ===================== SUMMARY =====================

  @Get('summary')
  getSummary(@Query('year') year?: string, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.getSummary(year ? parseInt(year, 10) : undefined);
  }

  // ===================== REVENUE CATEGORIES =====================

  @Get('revenue-categories')
  findAllRevenueCategories(@Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.findAllRevenueCategories();
  }

  @Post('revenue-categories')
  createRevenueCategory(@Body() dto: CreateRevenueCategoryDto, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.createRevenueCategory(dto);
  }

  @Put('revenue-categories/:id')
  updateRevenueCategory(
    @Param('id') id: string,
    @Body() dto: UpdateRevenueCategoryDto,
    @Request() req?,
  ) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.updateRevenueCategory(id, dto);
  }

  @Delete('revenue-categories/:id')
  deleteRevenueCategory(@Param('id') id: string, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.deleteRevenueCategory(id);
  }

  // ===================== MONTHLY REVENUE =====================

  @Get('revenue-summary')
  getRevenueSummary(@Query('year') year?: string, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.acquisitionsService.getRevenueSummary(y);
  }

  @Post('monthly-revenue')
  upsertMonthlyRevenue(@Body() dto: UpsertMonthlyRevenueDto, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.upsertMonthlyRevenue(dto);
  }

  @Delete('monthly-revenue/:id')
  deleteMonthlyRevenue(@Param('id') id: string, @Request() req?) {
    this.acquisitionsService.checkAccess(req.user);
    return this.acquisitionsService.deleteMonthlyRevenue(id);
  }
}
