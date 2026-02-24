import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BudgetPosition, BudgetCategory } from './entities/budget-position.entity';
import { Acquisition } from './entities/acquisition.entity';
import { AcquisitionInvoice } from './entities/acquisition-invoice.entity';
import { CreateBudgetPositionDto, UpdateBudgetPositionDto } from './dto/create-budget-position.dto';
import { CreateAcquisitionDto, UpdateAcquisitionDto } from './dto/create-acquisition.dto';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/create-invoice.dto';
import { CreateRevenueCategoryDto, UpdateRevenueCategoryDto } from './dto/create-revenue-category.dto';
import { UpsertMonthlyRevenueDto, UpdateMonthlyRevenueDto } from './dto/create-monthly-revenue.dto';
import { RevenueCategory } from './entities/revenue-category.entity';
import { MonthlyRevenue } from './entities/monthly-revenue.entity';
import { UserRole } from '../users/entities/user.entity';
import { CashCollectionsService } from '../parking/cash-collections.service';

// Numele departamentului Achizitii - userii din acest departament au acces complet
const ACHIZITII_DEPARTMENT_NAME = 'Achizitii';

@Injectable()
export class AcquisitionsService {
  constructor(
    @InjectRepository(BudgetPosition)
    private budgetPositionRepository: Repository<BudgetPosition>,
    @InjectRepository(Acquisition)
    private acquisitionRepository: Repository<Acquisition>,
    @InjectRepository(AcquisitionInvoice)
    private invoiceRepository: Repository<AcquisitionInvoice>,
    @InjectRepository(RevenueCategory)
    private revenueCategoryRepository: Repository<RevenueCategory>,
    @InjectRepository(MonthlyRevenue)
    private monthlyRevenueRepository: Repository<MonthlyRevenue>,
    private readonly cashCollectionsService: CashCollectionsService,
  ) {}

  /**
   * Verifica daca userul are acces la modulul Achizitii
   * Acces: ADMIN, MANAGER (toti), sau USER din departamentul Achizitii
   */
  checkAccess(user: any) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.MANAGER) return;
    if (user.department?.name === ACHIZITII_DEPARTMENT_NAME) return;
    throw new ForbiddenException('Nu aveti acces la modulul Achizitii');
  }

  // ===================== BUDGET POSITIONS =====================

  async findAllBudgetPositions(filters: { year?: number; category?: BudgetCategory }) {
    const query = this.budgetPositionRepository
      .createQueryBuilder('bp')
      .leftJoinAndSelect('bp.acquisitions', 'acq')
      .leftJoinAndSelect('acq.invoices', 'inv')
      .orderBy('bp.name', 'ASC');

    if (filters.year) {
      query.andWhere('bp.year = :year', { year: filters.year });
    }
    if (filters.category) {
      query.andWhere('bp.category = :category', { category: filters.category });
    }

    const positions = await query.getMany();

    // Calculate amounts for each position
    return positions.map((bp) => this.enrichBudgetPosition(bp));
  }

  async findOneBudgetPosition(id: string) {
    const bp = await this.budgetPositionRepository.findOne({
      where: { id },
      relations: ['acquisitions', 'acquisitions.invoices'],
    });
    if (!bp) {
      throw new NotFoundException('Pozitia bugetara nu a fost gasita');
    }
    return this.enrichBudgetPosition(bp);
  }

  async createBudgetPosition(dto: CreateBudgetPositionDto) {
    const bp = this.budgetPositionRepository.create({
      year: dto.year,
      category: dto.category,
      name: dto.name,
      totalAmount: dto.totalAmount,
      description: dto.description || null,
    });
    const saved = await this.budgetPositionRepository.save(bp);
    return this.findOneBudgetPosition(saved.id);
  }

  async updateBudgetPosition(id: string, dto: UpdateBudgetPositionDto) {
    const bp = await this.budgetPositionRepository.findOne({ where: { id } });
    if (!bp) {
      throw new NotFoundException('Pozitia bugetara nu a fost gasita');
    }

    if (dto.year !== undefined) bp.year = dto.year;
    if (dto.category !== undefined) bp.category = dto.category;
    if (dto.name !== undefined) bp.name = dto.name;
    if (dto.totalAmount !== undefined) bp.totalAmount = dto.totalAmount;
    if (dto.description !== undefined) bp.description = dto.description;

    await this.budgetPositionRepository.save(bp);
    return this.findOneBudgetPosition(id);
  }

  async deleteBudgetPosition(id: string) {
    const bp = await this.budgetPositionRepository.findOne({ where: { id } });
    if (!bp) {
      throw new NotFoundException('Pozitia bugetara nu a fost gasita');
    }
    await this.budgetPositionRepository.remove(bp);
    return { deleted: true };
  }

  // ===================== ACQUISITIONS =====================

  async findOneAcquisition(id: string) {
    const acq = await this.acquisitionRepository.findOne({
      where: { id },
      relations: ['budgetPosition', 'invoices'],
    });
    if (!acq) {
      throw new NotFoundException('Achizitia nu a fost gasita');
    }
    return this.enrichAcquisition(acq);
  }

  async createAcquisition(dto: CreateAcquisitionDto) {
    // Verify budget position exists and get remaining amount
    const bp = await this.findOneBudgetPosition(dto.budgetPositionId);

    const value = Number(dto.value);

    // Check budget availability
    if (value > bp.remainingAmount) {
      throw new BadRequestException(
        `Suma achizitiei (${value}) depaseste suma ramasa a pozitiei bugetare (${bp.remainingAmount})`,
      );
    }

    const acq = this.acquisitionRepository.create({
      budgetPositionId: dto.budgetPositionId,
      name: dto.name,
      value: value,
      isFullPurchase: dto.isFullPurchase || false,
      referat: dto.referat || null,
      caietDeSarcini: dto.caietDeSarcini || null,
      notaJustificativa: dto.notaJustificativa || null,
      contractNumber: dto.contractNumber || null,
      contractDate: dto.contractDate || null,
      ordinIncepere: dto.ordinIncepere || null,
      procesVerbalReceptie: dto.procesVerbalReceptie || null,
      isServiceContract: dto.isServiceContract || false,
      serviceMonths: dto.serviceMonths || null,
      serviceStartDate: dto.serviceStartDate || null,
      receptionDay: dto.receptionDay || null,
      notes: dto.notes || null,
    });

    const saved = await this.acquisitionRepository.save(acq);
    return this.findOneAcquisition(saved.id);
  }

  async updateAcquisition(id: string, dto: UpdateAcquisitionDto) {
    const acq = await this.acquisitionRepository.findOne({
      where: { id },
      relations: ['invoices'],
    });
    if (!acq) {
      throw new NotFoundException('Achizitia nu a fost gasita');
    }

    // If value is being changed, check budget availability
    if (dto.value !== undefined) {
      const bp = await this.findOneBudgetPosition(acq.budgetPositionId);
      const currentAcqValue = Number(acq.value);
      const newValue = Number(dto.value);
      const availableAmount = bp.remainingAmount + currentAcqValue; // Add back current value
      if (newValue > availableAmount) {
        throw new BadRequestException(
          `Suma achizitiei (${newValue}) depaseste suma disponibila a pozitiei bugetare (${availableAmount})`,
        );
      }
    }

    if (dto.name !== undefined) acq.name = dto.name;
    if (dto.value !== undefined) acq.value = Number(dto.value);
    if (dto.isFullPurchase !== undefined) acq.isFullPurchase = dto.isFullPurchase;
    if (dto.referat !== undefined) acq.referat = dto.referat;
    if (dto.caietDeSarcini !== undefined) acq.caietDeSarcini = dto.caietDeSarcini;
    if (dto.notaJustificativa !== undefined) acq.notaJustificativa = dto.notaJustificativa;
    if (dto.contractNumber !== undefined) acq.contractNumber = dto.contractNumber;
    if (dto.contractDate !== undefined) acq.contractDate = dto.contractDate ? new Date(dto.contractDate) : null;
    if (dto.ordinIncepere !== undefined) acq.ordinIncepere = dto.ordinIncepere;
    if (dto.procesVerbalReceptie !== undefined) acq.procesVerbalReceptie = dto.procesVerbalReceptie;
    if (dto.isServiceContract !== undefined) acq.isServiceContract = dto.isServiceContract;
    if (dto.serviceMonths !== undefined) acq.serviceMonths = dto.serviceMonths;
    if (dto.serviceStartDate !== undefined) acq.serviceStartDate = dto.serviceStartDate ? new Date(dto.serviceStartDate) : null;
    if (dto.receptionDay !== undefined) acq.receptionDay = dto.receptionDay;
    if (dto.notes !== undefined) acq.notes = dto.notes;

    await this.acquisitionRepository.save(acq);
    return this.findOneAcquisition(id);
  }

  async deleteAcquisition(id: string) {
    const acq = await this.acquisitionRepository.findOne({ where: { id } });
    if (!acq) {
      throw new NotFoundException('Achizitia nu a fost gasita');
    }
    await this.acquisitionRepository.remove(acq);
    return { deleted: true };
  }

  // ===================== INVOICES =====================

  async createInvoice(dto: CreateInvoiceDto) {
    const acq = await this.findOneAcquisition(dto.acquisitionId);

    const amount = Number(dto.amount);

    // Check that invoice amount doesn't exceed remaining
    if (amount > acq.remainingAmount) {
      throw new BadRequestException(
        `Suma facturii (${amount}) depaseste suma ramasa a achizitiei (${acq.remainingAmount})`,
      );
    }

    // Auto-set month number for service contracts
    let monthNumber = dto.monthNumber || null;
    if (acq.isServiceContract && !monthNumber) {
      const existingInvoices = await this.invoiceRepository.count({
        where: { acquisitionId: dto.acquisitionId },
      });
      monthNumber = existingInvoices + 1;
    }

    const invoice = this.invoiceRepository.create({
      acquisitionId: dto.acquisitionId,
      invoiceNumber: dto.invoiceNumber,
      invoiceDate: dto.invoiceDate,
      amount: amount,
      monthNumber: monthNumber,
      notes: dto.notes || null,
    });

    const saved = await this.invoiceRepository.save(invoice);
    return this.invoiceRepository.findOne({
      where: { id: saved.id },
      relations: ['acquisition'],
    });
  }

  async updateInvoice(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['acquisition'],
    });
    if (!invoice) {
      throw new NotFoundException('Factura nu a fost gasita');
    }

    // If amount changes, check remaining
    if (dto.amount !== undefined) {
      const acq = await this.findOneAcquisition(invoice.acquisitionId);
      const currentAmount = Number(invoice.amount);
      const newAmount = Number(dto.amount);
      const availableAmount = acq.remainingAmount + currentAmount;
      if (newAmount > availableAmount) {
        throw new BadRequestException(
          `Suma facturii (${newAmount}) depaseste suma disponibila a achizitiei (${availableAmount})`,
        );
      }
    }

    if (dto.invoiceNumber !== undefined) invoice.invoiceNumber = dto.invoiceNumber;
    if (dto.invoiceDate !== undefined) invoice.invoiceDate = new Date(dto.invoiceDate);
    if (dto.amount !== undefined) invoice.amount = Number(dto.amount);
    if (dto.monthNumber !== undefined) invoice.monthNumber = dto.monthNumber;
    if (dto.notes !== undefined) invoice.notes = dto.notes;

    await this.invoiceRepository.save(invoice);
    return this.invoiceRepository.findOne({
      where: { id },
      relations: ['acquisition'],
    });
  }

  async deleteInvoice(id: string) {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Factura nu a fost gasita');
    }
    await this.invoiceRepository.remove(invoice);
    return { deleted: true };
  }

  // ===================== SUMMARY =====================

  async getSummary(year?: number) {
    const currentYear = year || new Date().getFullYear();

    const positions = await this.findAllBudgetPositions({
      year: currentYear,
    });

    const investments = positions.filter((p) => p.category === 'INVESTMENTS');
    const currentExpenses = positions.filter((p) => p.category === 'CURRENT_EXPENSES');

    const calcCategory = (items: any[]) => {
      const totalBudgeted = items.reduce((sum, p) => sum + Number(p.totalAmount), 0);
      const totalSpent = items.reduce((sum, p) => sum + Number(p.spentAmount), 0);
      const totalRemaining = items.reduce((sum, p) => sum + Number(p.remainingAmount), 0);
      return { totalBudgeted, totalSpent, totalRemaining, count: items.length };
    };

    return {
      year: currentYear,
      investments: calcCategory(investments),
      currentExpenses: calcCategory(currentExpenses),
      total: calcCategory(positions),
    };
  }

  // ===================== REVENUE CATEGORIES =====================

  async findAllRevenueCategories(includeInactive = false) {
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    // Only top-level categories; children come via relation
    where.parentId = IsNull();
    return this.revenueCategoryRepository.find({
      where,
      relations: ['children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findAllRevenueCategoriesFlat(includeInactive = false) {
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    return this.revenueCategoryRepository.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOneRevenueCategory(id: string) {
    const cat = await this.revenueCategoryRepository.findOne({ where: { id } });
    if (!cat) {
      throw new NotFoundException('Categoria de incasari nu a fost gasita');
    }
    return cat;
  }

  async createRevenueCategory(dto: CreateRevenueCategoryDto) {
    // If parentId provided, verify parent exists
    if (dto.parentId) {
      await this.findOneRevenueCategory(dto.parentId);
    }

    // Auto-set sortOrder scoped to parent level
    if (dto.sortOrder === undefined) {
      const qb = this.revenueCategoryRepository
        .createQueryBuilder('rc')
        .select('MAX(rc.sortOrder)', 'max');
      if (dto.parentId) {
        qb.where('rc.parentId = :parentId', { parentId: dto.parentId });
      } else {
        qb.where('rc.parentId IS NULL');
      }
      const maxOrder = await qb.getRawOne();
      dto.sortOrder = (maxOrder?.max || 0) + 1;
    }
    const cat = this.revenueCategoryRepository.create({
      name: dto.name,
      description: dto.description || null,
      parentId: dto.parentId || null,
      parkingLotId: dto.parkingLotId || null,
      sortOrder: dto.sortOrder,
    });
    return this.revenueCategoryRepository.save(cat);
  }

  async updateRevenueCategory(id: string, dto: UpdateRevenueCategoryDto) {
    const cat = await this.findOneRevenueCategory(id);
    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.description !== undefined) cat.description = dto.description;
    if (dto.parkingLotId !== undefined) cat.parkingLotId = dto.parkingLotId || null;
    if (dto.sortOrder !== undefined) cat.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) cat.isActive = dto.isActive;
    return this.revenueCategoryRepository.save(cat);
  }

  async deleteRevenueCategory(id: string) {
    const cat = await this.findOneRevenueCategory(id);
    await this.revenueCategoryRepository.remove(cat);
    return { deleted: true };
  }

  // ===================== MONTHLY REVENUE =====================

  async findMonthlyRevenues(year: number, categoryId?: string) {
    const query = this.monthlyRevenueRepository
      .createQueryBuilder('mr')
      .leftJoinAndSelect('mr.revenueCategory', 'rc')
      .where('mr.year = :year', { year })
      .orderBy('rc.sort_order', 'ASC')
      .addOrderBy('mr.month', 'ASC');

    if (categoryId) {
      query.andWhere('mr.revenue_category_id = :categoryId', { categoryId });
    }

    return query.getMany();
  }

  async upsertMonthlyRevenue(dto: UpsertMonthlyRevenueDto) {
    // Verify category exists
    await this.findOneRevenueCategory(dto.revenueCategoryId);

    let existing = await this.monthlyRevenueRepository.findOne({
      where: {
        revenueCategoryId: dto.revenueCategoryId,
        year: dto.year,
        month: dto.month,
      },
    });

    if (existing) {
      existing.incasari = dto.incasari;
      if (dto.incasariCard !== undefined) existing.incasariCard = dto.incasariCard;
      existing.cheltuieli = dto.cheltuieli;
      if (dto.notes !== undefined) existing.notes = dto.notes;
      return this.monthlyRevenueRepository.save(existing);
    } else {
      const mr = this.monthlyRevenueRepository.create({
        revenueCategoryId: dto.revenueCategoryId,
        year: dto.year,
        month: dto.month,
        incasari: dto.incasari,
        incasariCard: dto.incasariCard || 0,
        cheltuieli: dto.cheltuieli,
        notes: dto.notes || null,
      });
      return this.monthlyRevenueRepository.save(mr);
    }
  }

  async deleteMonthlyRevenue(id: string) {
    const mr = await this.monthlyRevenueRepository.findOne({ where: { id } });
    if (!mr) {
      throw new NotFoundException('Inregistrarea lunara nu a fost gasita');
    }
    await this.monthlyRevenueRepository.remove(mr);
    return { deleted: true };
  }

  // ===================== REVENUE SUMMARY =====================

  async getRevenueSummary(year: number) {
    // Get ALL active categories (flat list including children)
    const allCategories = await this.findAllRevenueCategoriesFlat();
    // Get top-level categories with children loaded
    const topLevelCategories = await this.findAllRevenueCategories();
    const monthlyData = await this.findMonthlyRevenues(year);

    // --- Cash from CashCollections for parking-linked categories ---
    // Collect all parkingLotIds from categories that have one
    const parkingLotIds = allCategories
      .filter((c) => c.parkingLotId)
      .map((c) => c.parkingLotId!);
    const uniqueParkingLotIds = [...new Set(parkingLotIds)];

    // Fetch monthly cash totals in a single optimized query
    let cashTotalsMap: Record<string, Record<number, number>> = {};
    if (uniqueParkingLotIds.length > 0) {
      cashTotalsMap = await this.cashCollectionsService.getCashTotalsByLotAndMonth(
        uniqueParkingLotIds,
        year,
      );
    }

    // Build a map from categoryId -> parkingLotId for quick lookup
    const catParkingLotMap = new Map<string, string | null>();
    for (const cat of allCategories) {
      catParkingLotMap.set(cat.id, cat.parkingLotId || null);
    }

    // Build a map of category data (for ALL categories)
    const categoryDataMap = new Map<
      string,
      {
        months: Record<number, { incasari: number; incasariCash: number; incasariCard: number; cheltuieli: number; notes: string | null; id: string }>;
        totalIncasari: number;
        totalCheltuieli: number;
      }
    >();

    for (const cat of allCategories) {
      categoryDataMap.set(cat.id, { months: {}, totalIncasari: 0, totalCheltuieli: 0 });
    }

    // Fill monthly data from DB
    for (const mr of monthlyData) {
      const entry = categoryDataMap.get(mr.revenueCategoryId);
      if (entry) {
        const parkingLotId = catParkingLotMap.get(mr.revenueCategoryId);
        const incasariCard = Number(mr.incasariCard) || 0;
        const cheltuieli = Number(mr.cheltuieli) || 0;

        if (parkingLotId) {
          // Parking-linked category: cash is from CashCollections, card from DB
          const cashForMonth = cashTotalsMap[parkingLotId]?.[mr.month] || 0;
          const totalIncasari = cashForMonth + incasariCard;
          entry.months[mr.month] = {
            incasari: Math.round(totalIncasari * 100) / 100,
            incasariCash: Math.round(cashForMonth * 100) / 100,
            incasariCard: Math.round(incasariCard * 100) / 100,
            cheltuieli: Math.round(cheltuieli * 100) / 100,
            notes: mr.notes,
            id: mr.id,
          };
          entry.totalIncasari += totalIncasari;
        } else {
          // Regular category: incasari from DB
          const incasari = Number(mr.incasari) || 0;
          entry.months[mr.month] = {
            incasari: Math.round(incasari * 100) / 100,
            incasariCash: 0,
            incasariCard: 0,
            cheltuieli: Math.round(cheltuieli * 100) / 100,
            notes: mr.notes,
            id: mr.id,
          };
          entry.totalIncasari += incasari;
        }
        entry.totalCheltuieli += cheltuieli;
      }
    }

    // For parking-linked categories, also fill months that have cash but no DB record yet
    for (const cat of allCategories) {
      if (!cat.parkingLotId) continue;
      const entry = categoryDataMap.get(cat.id);
      if (!entry) continue;
      const cashForLot = cashTotalsMap[cat.parkingLotId] || {};
      for (let m = 1; m <= 12; m++) {
        if (!entry.months[m] && cashForLot[m]) {
          // Cash exists but no MonthlyRevenue record yet — show cash-only
          const cashAmount = Math.round(cashForLot[m] * 100) / 100;
          entry.months[m] = {
            incasari: cashAmount,
            incasariCash: cashAmount,
            incasariCard: 0,
            cheltuieli: 0,
            notes: null,
            id: '',
          };
          entry.totalIncasari += cashAmount;
        }
      }
    }

    // Compute grand totals
    let grandTotalIncasari = 0;
    let grandTotalCheltuieli = 0;
    const monthTotals: Record<number, { incasari: number; cheltuieli: number }> = {};
    for (let m = 1; m <= 12; m++) {
      monthTotals[m] = { incasari: 0, cheltuieli: 0 };
    }

    // Helper to build summary for a single category
    const buildCatSummary = (cat: RevenueCategory) => {
      const data = categoryDataMap.get(cat.id) || { months: {}, totalIncasari: 0, totalCheltuieli: 0 };
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        sortOrder: cat.sortOrder,
        parentId: cat.parentId || null,
        parkingLotId: cat.parkingLotId || null,
        isGroup: false,
        months: data.months,
        totalIncasari: Math.round(data.totalIncasari * 100) / 100,
        totalCheltuieli: Math.round(data.totalCheltuieli * 100) / 100,
        children: [] as any[],
      };
    };

    const result: any[] = [];

    for (const topCat of topLevelCategories) {
      const children = (topCat.children || []).filter((c) => c.isActive);
      children.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

      if (children.length > 0) {
        // GROUP: parent with children
        const childSummaries = children.map((child) => buildCatSummary(child));

        // Aggregate children data for parent totals
        let groupTotalIncasari = 0;
        let groupTotalCheltuieli = 0;
        const groupMonths: Record<number, { incasari: number; cheltuieli: number }> = {};
        for (let m = 1; m <= 12; m++) {
          groupMonths[m] = { incasari: 0, cheltuieli: 0 };
        }

        for (const cs of childSummaries) {
          groupTotalIncasari += cs.totalIncasari;
          groupTotalCheltuieli += cs.totalCheltuieli;
          for (let m = 1; m <= 12; m++) {
            const md = cs.months[m];
            if (md) {
              groupMonths[m].incasari += md.incasari;
              groupMonths[m].cheltuieli += md.cheltuieli;
            }
          }
          // Children contribute to grand totals
          grandTotalIncasari += cs.totalIncasari;
          grandTotalCheltuieli += cs.totalCheltuieli;
          for (let m = 1; m <= 12; m++) {
            const md = cs.months[m];
            if (md) {
              monthTotals[m].incasari += md.incasari;
              monthTotals[m].cheltuieli += md.cheltuieli;
            }
          }
        }

        result.push({
          categoryId: topCat.id,
          categoryName: topCat.name,
          sortOrder: topCat.sortOrder,
          parentId: null,
          parkingLotId: topCat.parkingLotId || null,
          isGroup: true,
          months: groupMonths,
          totalIncasari: Math.round(groupTotalIncasari * 100) / 100,
          totalCheltuieli: Math.round(groupTotalCheltuieli * 100) / 100,
          children: childSummaries,
        });
      } else {
        // SIMPLE: no children, has own data
        const summary = buildCatSummary(topCat);
        grandTotalIncasari += summary.totalIncasari;
        grandTotalCheltuieli += summary.totalCheltuieli;
        for (let m = 1; m <= 12; m++) {
          const md = summary.months[m];
          if (md) {
            monthTotals[m].incasari += md.incasari;
            monthTotals[m].cheltuieli += md.cheltuieli;
          }
        }
        result.push(summary);
      }
    }

    return {
      year,
      categories: result,
      monthTotals,
      grandTotalIncasari: Math.round(grandTotalIncasari * 100) / 100,
      grandTotalCheltuieli: Math.round(grandTotalCheltuieli * 100) / 100,
    };
  }

  // ===================== HELPERS =====================

  private enrichBudgetPosition(bp: BudgetPosition) {
    const totalAmount = Number(bp.totalAmount);
    const acquisitions = (bp.acquisitions || []).map((acq) => this.enrichAcquisition(acq));
    const spentAmount = acquisitions.reduce((sum, a) => sum + Number(a.value), 0);
    const remainingAmount = totalAmount - spentAmount;

    return {
      ...bp,
      totalAmount,
      acquisitions,
      spentAmount: Math.round(spentAmount * 100) / 100,
      remainingAmount: Math.round(remainingAmount * 100) / 100,
    };
  }

  private enrichAcquisition(acq: Acquisition) {
    const value = Number(acq.value);
    const invoices = acq.invoices || [];
    const invoicedAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const remainingAmount = value - invoicedAmount;

    // Generate monthly schedule for service contracts
    let monthlySchedule: any[] = [];
    if (acq.isServiceContract && acq.serviceMonths && acq.serviceStartDate) {
      const monthlyAmount = Math.round((value / acq.serviceMonths) * 100) / 100;
      const startDate = new Date(acq.serviceStartDate);

      for (let i = 0; i < acq.serviceMonths; i++) {
        const monthDate = new Date(startDate);
        monthDate.setMonth(monthDate.getMonth() + i);
        if (acq.receptionDay) {
          monthDate.setDate(acq.receptionDay);
        }

        const invoiceForMonth = invoices.find((inv) => inv.monthNumber === i + 1);

        monthlySchedule.push({
          monthNumber: i + 1,
          date: monthDate.toISOString().split('T')[0],
          expectedAmount: monthlyAmount,
          invoice: invoiceForMonth || null,
          status: invoiceForMonth ? 'INVOICED' : 'PENDING',
        });
      }
    }

    return {
      ...acq,
      value,
      invoicedAmount: Math.round(invoicedAmount * 100) / 100,
      remainingAmount: Math.round(remainingAmount * 100) / 100,
      monthlySchedule,
    };
  }
}
