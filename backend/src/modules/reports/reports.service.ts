import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';
import * as ExcelJS from 'exceljs';
import { GeneratedReport } from './entities/generated-report.entity';
import { ExportScheduleDto } from './dto/export-schedule.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { SchedulesService } from '../schedules/schedules.service';
import { StorageService } from '../../common/services/storage.service';
import { WorkSchedule } from '../schedules/entities/work-schedule.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { OvertimeService } from './services/overtime.service';
import { OvertimeReportFilters, OvertimeReportResponse } from './dto/overtime-report.dto';

interface WeeklySummary {
  userId: string;
  userName: string;
  weekNumber: number;
  totalHours: number;
  daysWorked: number;
  assignments: ScheduleAssignment[];
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(GeneratedReport)
    private reportsRepository: Repository<GeneratedReport>,
    private schedulesService: SchedulesService,
    private storageService: StorageService,
    private overtimeService: OvertimeService,
  ) {
    // Register Handlebars helpers
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('ro-RO');
    });

    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
  }

  async exportSchedule(
    scheduleId: string,
    userId: string,
    dto: ExportScheduleDto,
  ): Promise<ReportResponseDto> {
    // 1. Fetch schedule with all relations
    const schedule = await this.schedulesService.findOne(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    // 2. Validate labor law if requested
    const validation = dto.includeViolations
      ? await this.schedulesService.validateLaborLaw(scheduleId)
      : null;

    // 3. Aggregate weekly data
    const weeklySummaries = dto.includeWeeklySummaries
      ? this.calculateWeeklySummaries(schedule)
      : null;

    // 4. Generate report buffer
    const buffer = dto.format === 'PDF'
      ? await this.generatePdfReport(schedule, validation, weeklySummaries)
      : await this.generateExcelReport(schedule, validation, weeklySummaries);

    // 5. Upload to storage
    const fileName = `schedule-${schedule.monthYear}-${Date.now()}.${dto.format.toLowerCase()}`;
    const fileUrl = await this.storageService.upload(
      'reports',
      fileName,
      buffer,
      dto.format === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // 6. Save metadata
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const report = this.reportsRepository.create({
      reportType: `SCHEDULE_${dto.format}`,
      format: dto.format,
      generatedBy: userId,
      parameters: { scheduleId, ...dto },
      fileUrl,
      fileSizeBytes: buffer.length,
      expiresAt,
    });
    await this.reportsRepository.save(report);

    // 7. Return download info
    return {
      reportId: report.id,
      downloadUrl: fileUrl,
      fileName,
      fileSize: buffer.length,
      expiresAt,
    };
  }

  async getReport(reportId: string): Promise<GeneratedReport | null> {
    return this.reportsRepository.findOne({
      where: { id: reportId },
      relations: ['generator'],
    });
  }

  private async generatePdfReport(
    schedule: WorkSchedule,
    validation: any | null,
    weeklySummaries: WeeklySummary[] | null,
  ): Promise<Buffer> {
    // Load Handlebars template
    // __dirname in dist points to dist/modules/reports, we need to go to src
    const templatePath = path.join(process.cwd(), 'src', 'modules', 'reports', 'templates', 'schedule-template.hbs');
    const templateSource = await fs.promises.readFile(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);

    // Prepare data for template
    const html = template({
      schedule,
      validation,
      weeklySummaries,
      generatedAt: new Date().toLocaleString('ro-RO'),
      company: { name: 'Workforce Management System' },
    });

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    });
    await browser.close();

    return Buffer.from(pdfBuffer);
  }

  private async generateExcelReport(
    schedule: WorkSchedule,
    validation: any | null,
    weeklySummaries: WeeklySummary[] | null,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Program General
    const programSheet = workbook.addWorksheet('Program General');
    programSheet.columns = [
      { header: 'Angajat', key: 'employee', width: 25 },
      { header: 'Data', key: 'date', width: 12 },
      { header: 'Tura', key: 'shift', width: 20 },
      { header: 'Inceput', key: 'start', width: 10 },
      { header: 'Sfarsit', key: 'end', width: 10 },
      { header: 'Ore', key: 'hours', width: 8 },
      { header: 'Noapte', key: 'isNight', width: 8 },
      { header: 'Notite', key: 'notes', width: 30 },
    ];

    // Add header styling
    programSheet.getRow(1).font = { bold: true, size: 12 };
    programSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1976D2' },
    };
    programSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

    // Add data
    schedule.assignments
      .sort((a, b) => new Date(a.shiftDate).getTime() - new Date(b.shiftDate).getTime())
      .forEach((assignment) => {
        programSheet.addRow({
          employee: assignment.user?.fullName || 'N/A',
          date: new Date(assignment.shiftDate).toLocaleDateString('ro-RO'),
          shift: assignment.shiftType?.name || 'N/A',
          start: assignment.shiftType?.startTime || '',
          end: assignment.shiftType?.endTime || '',
          hours: assignment.shiftType?.durationHours || 0,
          isNight: assignment.shiftType?.isNightShift ? 'Da' : 'Nu',
          notes: assignment.notes || '',
        });
      });

    // Sheet 2: Rezumat Saptamanal (if included)
    if (weeklySummaries && weeklySummaries.length > 0) {
      const weeklySheet = workbook.addWorksheet('Rezumat Saptamanal');
      weeklySheet.columns = [
        { header: 'Angajat', key: 'employee', width: 25 },
        { header: 'Saptamana', key: 'week', width: 12 },
        { header: 'Total Ore', key: 'totalHours', width: 12 },
        { header: 'Zile Lucrate', key: 'daysWorked', width: 12 },
      ];

      // Add header styling
      weeklySheet.getRow(1).font = { bold: true, size: 12 };
      weeklySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1976D2' },
      };
      weeklySheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

      weeklySummaries.forEach((summary) => {
        weeklySheet.addRow({
          employee: summary.userName,
          week: `Saptamana ${summary.weekNumber}`,
          totalHours: summary.totalHours,
          daysWorked: summary.daysWorked,
        });
      });
    }

    // Sheet 3: Incalcari Legea Muncii (if included)
    if (validation && validation.violations && validation.violations.length > 0) {
      const violationsSheet = workbook.addWorksheet('Incalcari');
      violationsSheet.columns = [
        { header: 'Severitate', key: 'severity', width: 12 },
        { header: 'Tip', key: 'type', width: 20 },
        { header: 'Mesaj', key: 'message', width: 50 },
        { header: 'Referinta Legala', key: 'legalRef', width: 40 },
        { header: 'Angajat', key: 'employee', width: 25 },
      ];

      // Add header styling
      violationsSheet.getRow(1).font = { bold: true, size: 12 };
      violationsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD32F2F' },
      };
      violationsSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

      validation.violations.forEach((v: any) => {
        const user = schedule.assignments.find((a) => a.userId === v.userId)?.user;
        violationsSheet.addRow({
          severity: v.severity,
          type: v.type,
          message: v.message,
          legalRef: v.legalReference || '',
          employee: user?.fullName || 'N/A',
        });
      });
    }

    // Generate buffer
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private calculateWeeklySummaries(schedule: WorkSchedule): WeeklySummary[] {
    // Group assignments by user and week
    const userWeeklyData = new Map<string, Map<number, ScheduleAssignment[]>>();

    schedule.assignments.forEach((assignment) => {
      const date = new Date(assignment.shiftDate);
      const weekNumber = this.getWeekNumber(date);

      if (!userWeeklyData.has(assignment.userId)) {
        userWeeklyData.set(assignment.userId, new Map());
      }
      const userWeeks = userWeeklyData.get(assignment.userId)!;

      if (!userWeeks.has(weekNumber)) {
        userWeeks.set(weekNumber, []);
      }
      userWeeks.get(weekNumber)!.push(assignment);
    });

    // Calculate summaries
    const summaries: WeeklySummary[] = [];
    userWeeklyData.forEach((weeks, userId) => {
      weeks.forEach((assignments, weekNumber) => {
        const totalHours = assignments.reduce((sum, a) => sum + (a.shiftType?.durationHours || 0), 0);
        const daysWorked = assignments.filter((a) => !a.isRestDay).length;
        const userName = assignments[0]?.user?.fullName || 'N/A';

        summaries.push({
          userId,
          userName,
          weekNumber,
          totalHours,
          daysWorked,
          assignments,
        });
      });
    });

    return summaries.sort((a, b) => a.weekNumber - b.weekNumber || a.userId.localeCompare(b.userId));
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // ===== OVERTIME REPORTS =====

  async exportOvertimeReport(
    monthYear: string,
    userId: string,
    filters: OvertimeReportFilters,
  ): Promise<OvertimeReportResponse> {
    // Validate monthYear format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      throw new BadRequestException('Invalid monthYear format. Use YYYY-MM');
    }

    // 1. Calculate overtime data
    const overtimeData = await this.overtimeService.calculateMonthlyOvertime(
      monthYear,
      filters.userId,
      filters.departmentId,
    );

    if (!overtimeData || overtimeData.length === 0) {
      throw new NotFoundException('No overtime data found for the specified period');
    }

    // 2. Generate report buffer
    const format = filters.format || 'PDF';
    const buffer = format === 'PDF'
      ? await this.generateOvertimePdfReport(overtimeData, monthYear)
      : await this.generateOvertimeExcelReport(overtimeData, monthYear);

    // 3. Upload to storage
    const fileName = `overtime-${monthYear}-${Date.now()}.${format.toLowerCase()}`;
    const fileUrl = await this.storageService.upload(
      'reports',
      fileName,
      buffer,
      format === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // 4. Save metadata
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const report = this.reportsRepository.create({
      reportType: `OVERTIME_${format}`,
      format,
      generatedBy: userId,
      parameters: { monthYear, ...filters },
      fileUrl,
      fileSizeBytes: buffer.length,
      expiresAt,
    });
    await this.reportsRepository.save(report);

    // 5. Calculate summary statistics
    const totalEmployees = overtimeData.length;
    const totalOvertimeHours = overtimeData.reduce((sum, d) => sum + d.totalOvertimeHours, 0);
    const averageOvertimePerEmployee = totalEmployees > 0 ? totalOvertimeHours / totalEmployees : 0;

    // 6. Return download info
    return {
      reportId: report.id,
      downloadUrl: fileUrl,
      fileName,
      fileSize: buffer.length,
      expiresAt,
      summary: {
        totalEmployees,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        averageOvertimePerEmployee: Math.round(averageOvertimePerEmployee * 100) / 100,
      },
    };
  }

  private async generateOvertimePdfReport(
    overtimeData: any[],
    monthYear: string,
  ): Promise<Buffer> {
    // Load Handlebars template
    const templatePath = path.join(process.cwd(), 'src', 'modules', 'reports', 'templates', 'overtime-template.hbs');
    const templateSource = await fs.promises.readFile(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);

    // Calculate summary statistics
    const totalEmployees = overtimeData.length;
    const totalOvertimeHours = overtimeData.reduce((sum, d) => sum + d.totalOvertimeHours, 0);
    const averageOvertimePerEmployee = totalEmployees > 0 ? totalOvertimeHours / totalEmployees : 0;

    // Prepare data for template
    const html = template({
      monthYear,
      overtimeData,
      summary: {
        totalEmployees,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        averageOvertimePerEmployee: Math.round(averageOvertimePerEmployee * 100) / 100,
      },
      generatedAt: new Date().toLocaleString('ro-RO'),
      company: { name: 'Workforce Management System' },
    });

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    });
    await browser.close();

    return Buffer.from(pdfBuffer);
  }

  private async generateOvertimeExcelReport(
    overtimeData: any[],
    monthYear: string,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Detaliu Zilnic
    const dailySheet = workbook.addWorksheet('Detaliu Zilnic');
    dailySheet.columns = [
      { header: 'Angajat', key: 'employee', width: 25 },
      { header: 'Departament', key: 'department', width: 20 },
      { header: 'Data', key: 'date', width: 12 },
      { header: 'Ore Planificate', key: 'plannedHours', width: 15 },
      { header: 'Ore Lucrate', key: 'actualHours', width: 15 },
      { header: 'Ore Suplimentare', key: 'overtimeHours', width: 18 },
      { header: 'Status Aprobare', key: 'approvalStatus', width: 15 },
      { header: 'Notite', key: 'notes', width: 30 },
    ];

    // Header styling
    dailySheet.getRow(1).font = { bold: true, size: 12 };
    dailySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF388E3C' },
    };
    dailySheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

    // Add daily data
    overtimeData.forEach((userSummary) => {
      userSummary.dailyEntries.forEach((daily: any) => {
        const row = dailySheet.addRow({
          employee: daily.userName,
          department: userSummary.departmentName,
          date: new Date(daily.date).toLocaleDateString('ro-RO'),
          plannedHours: daily.plannedHours,
          actualHours: daily.actualHours,
          overtimeHours: daily.overtimeHours,
          approvalStatus: daily.isApproved ? 'Aprobat' : 'Neaprobat',
          notes: daily.notes || '',
        });

        // Color code overtime column
        const overtimeCell = row.getCell('overtimeHours');
        if (daily.overtimeHours > 0) {
          overtimeCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF9C4' }, // Light yellow
          };
        } else if (daily.overtimeHours < 0) {
          overtimeCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCDD2' }, // Light red
          };
        }
      });
    });

    // Sheet 2: Rezumat Saptamanal
    const weeklySheet = workbook.addWorksheet('Rezumat Saptamanal');
    weeklySheet.columns = [
      { header: 'Angajat', key: 'employee', width: 25 },
      { header: 'Saptamana', key: 'weekNumber', width: 12 },
      { header: 'Ore Planificate', key: 'plannedHours', width: 15 },
      { header: 'Ore Lucrate', key: 'actualHours', width: 15 },
      { header: 'Ore Suplimentare', key: 'overtimeHours', width: 18 },
      { header: 'Zile cu Overtime', key: 'daysWithOvertime', width: 18 },
    ];

    // Header styling
    weeklySheet.getRow(1).font = { bold: true, size: 12 };
    weeklySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF388E3C' },
    };
    weeklySheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

    // Add weekly data
    overtimeData.forEach((userSummary) => {
      userSummary.weeklySummaries.forEach((weekly: any) => {
        weeklySheet.addRow({
          employee: weekly.userName,
          weekNumber: `Saptamana ${weekly.weekNumber}`,
          plannedHours: weekly.plannedHours,
          actualHours: weekly.actualHours,
          overtimeHours: weekly.overtimeHours,
          daysWithOvertime: weekly.daysWithOvertime,
        });
      });
    });

    // Sheet 3: Rezumat Lunar
    const monthlySheet = workbook.addWorksheet('Rezumat Lunar');
    monthlySheet.columns = [
      { header: 'Angajat', key: 'employee', width: 25 },
      { header: 'Departament', key: 'department', width: 20 },
      { header: 'Total Ore Planificate', key: 'plannedHours', width: 20 },
      { header: 'Total Ore Lucrate', key: 'actualHours', width: 20 },
      { header: 'Total Ore Suplimentare', key: 'overtimeHours', width: 22 },
    ];

    // Header styling
    monthlySheet.getRow(1).font = { bold: true, size: 12 };
    monthlySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF388E3C' },
    };
    monthlySheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

    // Add monthly data
    overtimeData.forEach((userSummary) => {
      const row = monthlySheet.addRow({
        employee: userSummary.userName,
        department: userSummary.departmentName,
        plannedHours: userSummary.totalPlannedHours,
        actualHours: userSummary.totalActualHours,
        overtimeHours: userSummary.totalOvertimeHours,
      });

      // Color code total overtime
      const overtimeCell = row.getCell('overtimeHours');
      if (userSummary.totalOvertimeHours > 0) {
        overtimeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF9C4' },
        };
      } else if (userSummary.totalOvertimeHours < 0) {
        overtimeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCDD2' },
        };
      }
    });

    // Generate buffer
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
