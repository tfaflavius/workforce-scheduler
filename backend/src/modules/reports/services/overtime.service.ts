import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeEntry } from '../../time-tracking/entities/time-entry.entity';
import { ScheduleAssignment } from '../../schedules/entities/schedule-assignment.entity';
import {
  OvertimeMonthlySummary,
  OvertimeDayEntry,
  OvertimeWeeklySummary,
} from '../dto/overtime-report.dto';

@Injectable()
export class OvertimeService {
  constructor(
    @InjectRepository(TimeEntry)
    private timeEntryRepo: Repository<TimeEntry>,
    @InjectRepository(ScheduleAssignment)
    private scheduleAssignmentRepo: Repository<ScheduleAssignment>,
  ) {}

  /**
   * Calculate overtime for a specified month
   * Compares planned hours (from ScheduleAssignment) vs actual hours (from TimeEntry)
   */
  async calculateMonthlyOvertime(
    monthYear: string, // YYYY-MM
    userId?: string,
    departmentId?: string,
  ): Promise<OvertimeMonthlySummary[]> {
    const [year, month] = monthYear.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 1. Fetch scheduled hours for the month
    const scheduleQuery = this.scheduleAssignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('assignment.shiftType', 'shiftType')
      .where('assignment.shiftDate >= :startDate', { startDate })
      .andWhere('assignment.shiftDate <= :endDate', { endDate })
      .andWhere('assignment.isRestDay = :isRest', { isRest: false });

    if (userId) {
      scheduleQuery.andWhere('assignment.userId = :userId', { userId });
    }

    if (departmentId) {
      scheduleQuery.andWhere('user.departmentId = :departmentId', { departmentId });
    }

    const assignments = await scheduleQuery.getMany();

    // 2. Fetch actual worked hours for the same period
    const timeEntryQuery = this.timeEntryRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('user.department', 'department')
      .where('entry.startTime >= :startDate', { startDate })
      .andWhere('entry.startTime <= :endDate', { endDate })
      .andWhere('entry.endTime IS NOT NULL'); // only completed entries

    if (userId) {
      timeEntryQuery.andWhere('entry.userId = :userId', { userId });
    }

    if (departmentId) {
      timeEntryQuery.andWhere('user.departmentId = :departmentId', { departmentId });
    }

    const timeEntries = await timeEntryQuery.getMany();

    // 3. Group by user and calculate overtime
    const userMap = new Map<string, OvertimeMonthlySummary>();

    // Process scheduled hours
    assignments.forEach((assignment) => {
      const dateStr = new Date(assignment.shiftDate).toISOString().split('T')[0];

      if (!userMap.has(assignment.userId)) {
        userMap.set(assignment.userId, {
          month: monthYear,
          userId: assignment.userId,
          userName: assignment.user.fullName,
          departmentName: assignment.user.department?.name || 'N/A',
          totalPlannedHours: 0,
          totalActualHours: 0,
          totalOvertimeHours: 0,
          weeklySummaries: [],
          dailyEntries: [],
        });
      }

      const summary = userMap.get(assignment.userId)!;
      summary.totalPlannedHours += assignment.shiftType.durationHours;

      // Find or create daily entry
      let dailyEntry = summary.dailyEntries.find((e) => e.date === dateStr);
      if (!dailyEntry) {
        dailyEntry = {
          date: dateStr,
          userId: assignment.userId,
          userName: assignment.user.fullName,
          plannedHours: 0,
          actualHours: 0,
          overtimeHours: 0,
          isApproved: true,
          notes: '',
        };
        summary.dailyEntries.push(dailyEntry);
      }
      dailyEntry.plannedHours += assignment.shiftType.durationHours;
    });

    // Process actual worked hours
    timeEntries.forEach((entry) => {
      const dateStr = new Date(entry.startTime).toISOString().split('T')[0];
      const actualHours = entry.durationMinutes / 60;

      if (!userMap.has(entry.userId)) {
        // User worked but had no scheduled shift (full overtime)
        userMap.set(entry.userId, {
          month: monthYear,
          userId: entry.userId,
          userName: entry.user.fullName,
          departmentName: entry.user.department?.name || 'N/A',
          totalPlannedHours: 0,
          totalActualHours: 0,
          totalOvertimeHours: 0,
          weeklySummaries: [],
          dailyEntries: [],
        });
      }

      const summary = userMap.get(entry.userId)!;
      summary.totalActualHours += actualHours;

      // Find or create daily entry
      let dailyEntry = summary.dailyEntries.find((e) => e.date === dateStr);
      if (!dailyEntry) {
        dailyEntry = {
          date: dateStr,
          userId: entry.userId,
          userName: entry.user.fullName,
          plannedHours: 0,
          actualHours: 0,
          overtimeHours: 0,
          isApproved: true,
          notes: '',
        };
        summary.dailyEntries.push(dailyEntry);
      }
      dailyEntry.actualHours += actualHours;
      dailyEntry.isApproved = dailyEntry.isApproved && entry.approvalStatus === 'APPROVED';
    });

    // 4. Calculate overtime for each day and aggregate weekly
    userMap.forEach((summary) => {
      summary.dailyEntries.forEach((daily) => {
        daily.overtimeHours = daily.actualHours - daily.plannedHours;
      });

      summary.totalOvertimeHours = summary.totalActualHours - summary.totalPlannedHours;

      // Sort by date
      summary.dailyEntries.sort((a, b) => a.date.localeCompare(b.date));

      // Calculate weekly summaries
      summary.weeklySummaries = this.calculateWeeklySummaries(
        summary.dailyEntries,
        summary.userId,
        summary.userName,
      );
    });

    return Array.from(userMap.values());
  }

  /**
   * Calculate weekly summaries from daily entries
   */
  private calculateWeeklySummaries(
    dailyEntries: OvertimeDayEntry[],
    userId: string,
    userName: string,
  ): OvertimeWeeklySummary[] {
    const weekMap = new Map<number, OvertimeWeeklySummary>();

    dailyEntries.forEach((daily) => {
      const date = new Date(daily.date);
      const weekNumber = this.getWeekNumber(date);

      if (!weekMap.has(weekNumber)) {
        weekMap.set(weekNumber, {
          weekNumber,
          userId,
          userName,
          plannedHours: 0,
          actualHours: 0,
          overtimeHours: 0,
          daysWithOvertime: 0,
        });
      }

      const weekly = weekMap.get(weekNumber)!;
      weekly.plannedHours += daily.plannedHours;
      weekly.actualHours += daily.actualHours;
      weekly.overtimeHours += daily.overtimeHours;

      if (daily.overtimeHours > 0) {
        weekly.daysWithOvertime++;
      }
    });

    return Array.from(weekMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);
  }

  /**
   * Calculate ISO week number for a given date
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
