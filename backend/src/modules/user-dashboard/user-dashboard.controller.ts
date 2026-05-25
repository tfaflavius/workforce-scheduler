import { Controller, Get, UseGuards, Req, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import { DailyReport, DailyReportStatus } from '../daily-reports/entities/daily-report.entity';
import { HandicapRequest } from '../parking/entities/handicap-request.entity';
import { HandicapLegitimation } from '../parking/entities/handicap-legitimation.entity';
import { RevolutionarLegitimation } from '../parking/entities/revolutionar-legitimation.entity';
import { DomiciliuRequest } from '../parking/entities/domiciliu-request.entity';
import { ControlSesizare } from '../parking/entities/control-sesizare.entity';
import { ParkingIssue } from '../parking/entities/parking-issue.entity';
import { ParkingDamage } from '../parking/entities/parking-damage.entity';
import { CashCollection } from '../parking/entities/cash-collection.entity';
import { Acquisition } from '../acquisitions/entities/acquisition.entity';
import { BudgetPosition } from '../acquisitions/entities/budget-position.entity';
import { MonthlyRevenue } from '../acquisitions/entities/monthly-revenue.entity';
import { EquipmentStockEntry } from '../equipment-stock/entities/equipment-stock-entry.entity';
import { EquipmentStockDefinition } from '../equipment-stock/entities/equipment-stock-definition.entity';
import { ControlNotesService } from '../control-notes/control-notes.service';
import {
  DISPECERAT_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
  MAINTENANCE_DEPARTMENT_NAME,
  HANDICAP_PARKING_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
} from '../parking/constants/parking.constants';

const PARCOMETRE_DEPT = 'Parcometre';
const ACHIZITII_DEPT = 'Achizitii';
const PVF_DEPT = 'Procese Verbale/Facturare';

@Controller('user/dashboard')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class UserDashboardController {
  private readonly logger = new Logger(UserDashboardController.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepo: Repository<LeaveRequest>,
    @InjectRepository(DailyReport)
    private readonly dailyReportRepo: Repository<DailyReport>,
    @InjectRepository(HandicapRequest)
    private readonly handicapRequestRepo: Repository<HandicapRequest>,
    @InjectRepository(HandicapLegitimation)
    private readonly handicapLegitimationRepo: Repository<HandicapLegitimation>,
    @InjectRepository(RevolutionarLegitimation)
    private readonly revolutionarLegitimationRepo: Repository<RevolutionarLegitimation>,
    @InjectRepository(DomiciliuRequest)
    private readonly domiciliuRequestRepo: Repository<DomiciliuRequest>,
    @InjectRepository(ControlSesizare)
    private readonly controlSesizareRepo: Repository<ControlSesizare>,
    @InjectRepository(ParkingIssue)
    private readonly parkingIssueRepo: Repository<ParkingIssue>,
    @InjectRepository(ParkingDamage)
    private readonly parkingDamageRepo: Repository<ParkingDamage>,
    @InjectRepository(CashCollection)
    private readonly cashCollectionRepo: Repository<CashCollection>,
    @InjectRepository(Acquisition)
    private readonly acquisitionRepo: Repository<Acquisition>,
    @InjectRepository(BudgetPosition)
    private readonly budgetPositionRepo: Repository<BudgetPosition>,
    @InjectRepository(MonthlyRevenue)
    private readonly monthlyRevenueRepo: Repository<MonthlyRevenue>,
    @InjectRepository(EquipmentStockEntry)
    private readonly equipmentStockEntryRepo: Repository<EquipmentStockEntry>,
    @InjectRepository(EquipmentStockDefinition)
    private readonly equipmentStockDefRepo: Repository<EquipmentStockDefinition>,
    private readonly controlNotesService: ControlNotesService,
  ) {}

  @Get('stats')
  async getStats(@Req() req: any) {
    const userId = req.user.id;
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['department'],
    });

    const departmentName = user?.department?.name || '';
    const now = new Date();
    const romaniaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
    const todayStr = romaniaTime.toISOString().split('T')[0];
    const currentYear = romaniaTime.getFullYear();
    const currentMonth = romaniaTime.getMonth() + 1;

    // Common queries for all users
    const commonPromises = [
      this.leaveRequestRepo.count({ where: { userId, status: 'PENDING' } }),
      this.leaveRequestRepo.count({ where: { userId, status: 'APPROVED' } }),
      this.leaveRequestRepo.count({ where: { userId } }),
      this.dailyReportRepo.count({ where: { userId, status: DailyReportStatus.SUBMITTED } }),
      this.dailyReportRepo.count({ where: { userId, status: DailyReportStatus.DRAFT } }),
    ];

    const [leavesPending, leavesApproved, leavesTotal, reportsSubmitted, reportsDraft] =
      await Promise.all(commonPromises);

    const response: any = {
      department: departmentName,
      leaveRequests: { pending: leavesPending, approved: leavesApproved, total: leavesTotal },
      dailyReports: { submitted: reportsSubmitted, draft: reportsDraft },
    };

    // Department-specific queries
    const deptQueries: Promise<void>[] = [];

    // Handicap department
    if (departmentName === HANDICAP_PARKING_DEPARTMENT_NAME || departmentName === MAINTENANCE_DEPARTMENT_NAME) {
      deptQueries.push(
        Promise.all([
          this.handicapRequestRepo.count({ where: { requestType: 'AMPLASARE_PANOU', status: 'ACTIVE' } }),
          this.handicapRequestRepo.count({ where: { requestType: 'REVOCARE_PANOU', status: 'ACTIVE' } }),
          this.handicapRequestRepo.count({ where: { requestType: 'CREARE_MARCAJ', status: 'ACTIVE' } }),
          this.handicapLegitimationRepo.count({ where: { status: 'ACTIVE' } }),
          this.revolutionarLegitimationRepo.count({ where: { status: 'ACTIVE' } }),
        ]).then(([amplasare, revocare, marcaje, legit, revol]) => {
          response.handicap = {
            requestsByType: { amplasare, revocare, marcaje },
            legitimationsCount: legit,
            revolutionarCount: revol,
          };
        }),
      );
    }

    // Domiciliu department
    if (departmentName === DOMICILIU_PARKING_DEPARTMENT_NAME || departmentName === MAINTENANCE_DEPARTMENT_NAME || departmentName === HANDICAP_PARKING_DEPARTMENT_NAME) {
      deptQueries.push(
        Promise.all([
          this.domiciliuRequestRepo.count({ where: { status: 'ACTIVE' } }),
          this.domiciliuRequestRepo.count({ where: { status: 'FINALIZAT' } }),
          this.domiciliuRequestRepo.count({ where: { requestType: 'TRASARE_LOCURI', status: 'ACTIVE' } }),
          this.domiciliuRequestRepo.count({ where: { requestType: 'REVOCARE_LOCURI', status: 'ACTIVE' } }),
          this.domiciliuRequestRepo.count({ where: { requestType: 'AMPLASARE_PANOU', status: 'ACTIVE' } }),
          this.domiciliuRequestRepo.count({ where: { requestType: 'REVOCARE_PANOU', status: 'ACTIVE' } }),
        ]).then(([active, finalizat, trasare, revocare, amplasare, revocarePanou]) => {
          response.domiciliu = {
            active,
            finalizat,
            byType: { trasareLocuri: trasare, revocareLocuri: revocare, amplasarePanou: amplasare, revocarePanou },
          };
        }),
      );
    }

    // Control department
    if (departmentName === CONTROL_DEPARTMENT_NAME || departmentName === MAINTENANCE_DEPARTMENT_NAME) {
      deptQueries.push(
        Promise.all([
          this.controlSesizareRepo.count({ where: { status: 'ACTIVE' } }),
          this.controlSesizareRepo.count({ where: { status: 'FINALIZAT' } }),
          this.controlSesizareRepo.count({ where: { zone: 'ROSU', status: 'ACTIVE' } }),
          this.controlSesizareRepo.count({ where: { zone: 'GALBEN', status: 'ACTIVE' } }),
          this.controlSesizareRepo.count({ where: { zone: 'ALB', status: 'ACTIVE' } }),
        ]).then(([active, finalizat, rosu, galben, alb]) => {
          response.controlSesizari = { active, finalizat, byZone: { rosu, galben, alb } };
        }),
      );
    }

    // Parking (Dispecerat, Maintenance)
    if (departmentName === DISPECERAT_DEPARTMENT_NAME || departmentName === MAINTENANCE_DEPARTMENT_NAME) {
      deptQueries.push(
        Promise.all([
          this.parkingIssueRepo.count({ where: { status: 'ACTIVE' } }),
          this.parkingDamageRepo.count({ where: { status: 'ACTIVE' } }),
          this.cashCollectionRepo
            .createQueryBuilder('cc')
            .select('COALESCE(SUM(cc.amount), 0)', 'totalAmount')
            .addSelect('COUNT(cc.id)', 'count')
            .getRawOne(),
        ]).then(([activeIssues, activeDamages, cashTotals]) => {
          response.parking = {
            activeIssues,
            activeDamages,
            cashTotal: {
              totalAmount: parseFloat(cashTotals?.totalAmount || '0'),
              count: parseInt(cashTotals?.count || '0', 10),
            },
          };
        }),
      );
    }

    // Achizitii department
    if (departmentName === ACHIZITII_DEPT) {
      deptQueries.push(
        Promise.all([
          this.monthlyRevenueRepo
            .createQueryBuilder('mr')
            .select('COALESCE(SUM(mr.incasari), 0)', 'incasari')
            .addSelect('COALESCE(SUM(mr.incasariCard), 0)', 'incasariCard')
            .addSelect('COALESCE(SUM(mr.cheltuieli), 0)', 'cheltuieli')
            .where('mr.year = :year AND mr.month = :month', { year: currentYear, month: currentMonth })
            .getRawOne(),
          this.budgetPositionRepo
            .createQueryBuilder('bp')
            .select('COALESCE(SUM(CASE WHEN bp.category = :inv THEN bp.totalAmount ELSE 0 END), 0)', 'investments')
            .addSelect('COALESCE(SUM(CASE WHEN bp.category = :cur THEN bp.totalAmount ELSE 0 END), 0)', 'currentExpenses')
            .addSelect('COALESCE(SUM(bp.totalAmount), 0)', 'totalBudget')
            .where('bp.year = :year', { year: currentYear, inv: 'INVESTMENTS', cur: 'CURRENT_EXPENSES' })
            .getRawOne(),
          this.acquisitionRepo
            .createQueryBuilder('a')
            .select('COALESCE(SUM(a.value), 0)', 'totalSpent')
            .addSelect('COUNT(a.id)', 'count')
            .leftJoin('a.budgetPosition', 'bp')
            .where('bp.year = :year', { year: currentYear })
            .getRawOne(),
          // Year-to-date sums — used for the Achizitii dashboard summary
          // card. `incasari` only sums monthly_revenues for non-parking
          // categories: the actual parking cash comes from the
          // cash_collections query below (matches /incasari-cheltuieli).
          this.monthlyRevenueRepo
            .createQueryBuilder('mr')
            .leftJoin('revenue_categories', 'rc', 'rc.id = mr.revenue_category_id')
            .select('COALESCE(SUM(CASE WHEN rc.parking_lot_id IS NULL THEN mr.incasari ELSE 0 END), 0)', 'incasari')
            .addSelect('COALESCE(SUM(mr.incasariCard), 0)', 'incasariCard')
            .addSelect('COALESCE(SUM(mr.cheltuieli), 0)', 'cheltuieli')
            .where('mr.year = :year', { year: currentYear })
            .getRawOne(),
          // YTD parking cash collected automatically, gated to lots that
          // have a revenue_category mapping (matches getRevenueSummary).
          this.cashCollectionRepo
            .createQueryBuilder('cc')
            .select('COALESCE(SUM(cc.amount), 0)', 'cash')
            .where(
              `cc.parking_lot_id IN (
                 SELECT DISTINCT rc2.parking_lot_id
                 FROM revenue_categories rc2
                 WHERE rc2.parking_lot_id IS NOT NULL AND rc2.is_active = true
               )`,
            )
            .andWhere(
              `EXTRACT(YEAR FROM cc.collected_at AT TIME ZONE 'Europe/Bucharest') = :year`,
              { year: currentYear },
            )
            .getRawOne(),
        ]).then(([revTotals, budgetTotals, acqTotals, revYTD, parkingCashYTD]) => {
          response.revenue = {
            incasari: parseFloat(revTotals?.incasari || '0'),
            incasariCard: parseFloat(revTotals?.incasariCard || '0'),
            cheltuieli: parseFloat(revTotals?.cheltuieli || '0'),
            month: currentMonth,
            year: currentYear,
          };
          response.revenueYTD = {
            incasari:
              parseFloat(revYTD?.incasari || '0') +
              parseFloat(parkingCashYTD?.cash || '0'),
            incasariCard: parseFloat(revYTD?.incasariCard || '0'),
            cheltuieli: parseFloat(revYTD?.cheltuieli || '0'),
            year: currentYear,
          };
          response.achizitii = {
            totalBudget: parseFloat(budgetTotals?.totalBudget || '0'),
            investments: parseFloat(budgetTotals?.investments || '0'),
            currentExpenses: parseFloat(budgetTotals?.currentExpenses || '0'),
            totalSpent: parseFloat(acqTotals?.totalSpent || '0'),
            acquisitionsCount: parseInt(acqTotals?.count || '0', 10),
          };
        }),
      );
    }

    // Parcometre department
    if (departmentName === PARCOMETRE_DEPT || departmentName === MAINTENANCE_DEPARTMENT_NAME) {
      deptQueries.push(
        Promise.all([
          this.equipmentStockDefRepo.count(),
          this.equipmentStockEntryRepo
            .createQueryBuilder('e')
            .select('COALESCE(SUM(e.quantity), 0)', 'totalQty')
            .getRawOne(),
          this.equipmentStockEntryRepo
            .createQueryBuilder('e')
            .select('COUNT(DISTINCT e.category)', 'catCount')
            .getRawOne(),
        ]).then(([defsCount, totalQtyResult, catResult]) => {
          response.equipmentStock = {
            definitionsCount: defsCount,
            totalQuantity: parseInt(totalQtyResult?.totalQty || '0', 10),
            categoriesCount: parseInt(catResult?.catCount || '0', 10),
          };
        }),
      );
    }

    // Note de Constatare — visible to the dept that fills them (Parcometre)
    // so they can see the annual KPI of the work they record on Control
    // agents. Reuses the matrix service to keep the divisor (which excludes
    // DISP days) consistent with what /note-constatare shows.
    if (departmentName === PARCOMETRE_DEPT) {
      deptQueries.push(
        this.controlNotesService.getMatrix(currentYear).then((matrix) => {
          response.controlNotes = {
            year: matrix.year,
            grandTotal: matrix.totals.grandTotal,
            totalWorkingDays: matrix.totals.totalWorkingDays,
            averagePerWorkingDay: matrix.totals.averagePerWorkingDay,
          };
        }),
      );
    }

    await Promise.all(deptQueries);

    return response;
  }
}
