import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ControlInspectionNote } from './entities/control-inspection-note.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { UpsertControlNoteDto } from './dto/upsert-control-note.dto';
import {
  CONTROL_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
} from '../parking/constants/parking.constants';
import { isAdminOrAbove } from '../../common/utils/role-hierarchy';
import { removeDiacritics } from '../../common/utils/remove-diacritics';
import { workingDaysInMonth } from './utils/romanian-holidays';

export interface ControlUserNoteRow {
  userId: string;
  agentCode: string | null;
  fullName: string;
  isActive: boolean;
  monthlyCounts: (number | null)[]; // 12 entries (Jan..Dec); null when not set
  monthlyMarkers: (string | null)[];
  total: number;
  /** Total / sum of working days in months that HAVE a count */
  averagePerWorkingDay: number;
}

export interface ControlNotesMatrix {
  year: number;
  months: Array<{
    month: number;
    label: string;
    totalDays: number;
    weekendDays: number;
    holidayDays: number;
    workingDays: number;
    holidayDates: string[];
    /** Sum across all users for this month */
    totalCount: number;
  }>;
  users: ControlUserNoteRow[];
  totals: {
    grandTotal: number;
    totalWorkingDays: number;
    averagePerWorkingDay: number; // grandTotal / totalWorkingDays
  };
}

const MONTH_LABELS = [
  'Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun',
  'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

@Injectable()
export class ControlNotesService {
  private readonly logger = new Logger(ControlNotesService.name);

  constructor(
    @InjectRepository(ControlInspectionNote)
    private readonly noteRepository: Repository<ControlInspectionNote>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(ScheduleAssignment)
    private readonly assignmentRepository: Repository<ScheduleAssignment>,
  ) {}

  /**
   * Returns the full year matrix: every Control-department user with their
   * 12 monthly counts, totals, and per-day averages. Includes per-month
   * working-day metadata (weekends + holidays).
   */
  async getMatrix(year: number): Promise<ControlNotesMatrix> {
    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      throw new BadRequestException('Anul nu este valid');
    }

    // Pull Control department
    const controlDept = await this.departmentRepository.findOne({
      where: { name: CONTROL_DEPARTMENT_NAME },
    });
    if (!controlDept) {
      return {
        year,
        months: this.buildMonthsMeta(year, []),
        users: [],
        totals: { grandTotal: 0, totalWorkingDays: 0, averagePerWorkingDay: 0 },
      };
    }

    // All users that ever had a note for this year (might have changed dept)
    // OR are currently in Control. Union of both gives historical accuracy.
    const usersFromHistory = await this.noteRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.user', 'user')
      .where('note.year = :year', { year })
      .getMany();
    const userIdsFromHistory = new Set(usersFromHistory.map(n => n.userId));

    const currentControlUsers = await this.userRepository.find({
      where: { departmentId: controlDept.id },
    });

    const userMap = new Map<string, User>();
    for (const u of currentControlUsers) userMap.set(u.id, u);
    for (const n of usersFromHistory) if (n.user) userMap.set(n.user.id, n.user);

    // Pull all notes for this year (one query)
    const notes = await this.noteRepository.find({ where: { year } });
    const noteMap = new Map<string, ControlInspectionNote>();
    for (const n of notes) noteMap.set(`${n.userId}|${n.month}`, n);

    // Days each Control user was unavailable for Control work — they were
    // either scheduled on Dispecerat (DISP) or on approved leave (concediu).
    // Both reduce the divisor of the per-day notes average so an agent on
    // vacation isn't penalised for filing zero notes that week.
    // Map: `${userId}|${month}` -> count of unavailable weekdays in month.
    const unavailableDaysMap = await this.getUnavailableDaysForUsers(
      Array.from(userMap.keys()),
      year,
    );

    // Build per-month working-day stats
    const monthsMeta = this.buildMonthsMeta(year, []);

    // Build user rows
    const users: ControlUserNoteRow[] = [];
    let grandTotal = 0;
    let grandAdjustedWorkingDays = 0;
    const monthSums = Array.from({ length: 12 }, () => 0);

    // Sort: first current Control users alphabetically, then ex-Control with history
    const orderedUsers = Array.from(userMap.values()).sort((a, b) => {
      const aIsCurrent = currentControlUsers.some(u => u.id === a.id) ? 0 : 1;
      const bIsCurrent = currentControlUsers.some(u => u.id === b.id) ? 0 : 1;
      if (aIsCurrent !== bIsCurrent) return aIsCurrent - bIsCurrent;
      return removeDiacritics(a.fullName).localeCompare(removeDiacritics(b.fullName));
    });

    for (const u of orderedUsers) {
      const monthlyCounts: (number | null)[] = Array.from({ length: 12 }, () => null);
      const monthlyMarkers: (string | null)[] = Array.from({ length: 12 }, () => null);
      let userTotal = 0;
      let userAdjustedWorkingDays = 0;

      for (let m = 1; m <= 12; m++) {
        const note = noteMap.get(`${u.id}|${m}`);
        if (note) {
          monthlyCounts[m - 1] = note.count;
          monthlyMarkers[m - 1] = note.marker || null;
          userTotal += note.count;
          monthSums[m - 1] += note.count;
          const unavailableDays = unavailableDaysMap.get(`${u.id}|${m}`) || 0;
          // Clamp so a user with more unavailable days than working days
          // (edge case around overlapping leaves/holidays) doesn't push the
          // divisor negative.
          const monthAdjusted = Math.max(0, monthsMeta[m - 1].workingDays - unavailableDays);
          userAdjustedWorkingDays += monthAdjusted;
        }
      }

      users.push({
        userId: u.id,
        agentCode: (u as any).agentCode ?? null,
        fullName: u.fullName,
        isActive: u.isActive,
        monthlyCounts,
        monthlyMarkers,
        total: userTotal,
        averagePerWorkingDay:
          userAdjustedWorkingDays > 0
            ? Math.round((userTotal / userAdjustedWorkingDays) * 100) / 100
            : 0,
      });

      grandTotal += userTotal;
      grandAdjustedWorkingDays += userAdjustedWorkingDays;
    }

    // Re-attach month totals
    const months = monthsMeta.map((m, i) => ({ ...m, totalCount: monthSums[i] }));

    return {
      year,
      months,
      users,
      totals: {
        grandTotal,
        // Now represents the team's total *Control-work-day capacity* for the
        // months with data: sum over users of (working days - their DISP days).
        totalWorkingDays: grandAdjustedWorkingDays,
        averagePerWorkingDay:
          grandAdjustedWorkingDays > 0
            ? Math.round((grandTotal / grandAdjustedWorkingDays) * 100) / 100
            : 0,
      },
    };
  }

  /**
   * Counts, per (userId, month), the number of **weekdays** in the given year
   * where each user was unable to do Control work — i.e. scheduled on the
   * Dispecerat work position (DISP) OR marked with any leave_type (concediu,
   * which the leave-requests flow writes onto the schedule assignment).
   *
   * Only weekdays count, since the working-day divisor we subtract from also
   * excludes weekends. COUNT(DISTINCT shiftDate) guards against the very
   * unlikely case of both flags being set on the same day.
   *
   * Returns an empty map when the user list is empty (an empty IN list would
   * otherwise match every row, so guard explicitly).
   */
  private async getUnavailableDaysForUsers(
    userIds: string[],
    year: number,
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (userIds.length === 0) return map;

    const rows = await this.assignmentRepository
      .createQueryBuilder('a')
      .leftJoin('a.workPosition', 'wp')
      .select('a.userId', 'userId')
      .addSelect('EXTRACT(MONTH FROM a.shiftDate)', 'month')
      .addSelect('COUNT(DISTINCT a.shiftDate)', 'days')
      .where('a.userId IN (:...ids)', { ids: userIds })
      .andWhere('EXTRACT(YEAR FROM a.shiftDate) = :year', { year })
      // Weekday only: PostgreSQL DOW gives 0=Sunday, 6=Saturday.
      .andWhere('EXTRACT(DOW FROM a.shiftDate) NOT IN (0, 6)')
      .andWhere('(wp.shortName = :pos OR a.leaveType IS NOT NULL)', { pos: 'DISP' })
      .groupBy('a.userId')
      .addGroupBy('EXTRACT(MONTH FROM a.shiftDate)')
      .getRawMany<{ userId: string; month: string; days: string }>();

    for (const r of rows) {
      const m = parseInt(r.month, 10);
      const days = parseInt(r.days, 10);
      if (!isNaN(m) && !isNaN(days)) {
        map.set(`${r.userId}|${m}`, days);
      }
    }
    return map;
  }

  /**
   * Upsert a (user, year, month) row. Restricted to Parcometre dept users
   * + Admin/Manager — guards enforce that on the controller.
   */
  async upsert(
    actor: User,
    dto: UpsertControlNoteDto,
  ): Promise<ControlInspectionNote> {
    await this.assertCanEdit(actor);

    // Validate target user exists
    const target = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!target) {
      throw new BadRequestException('User-ul tinta nu a fost gasit');
    }

    const existing = await this.noteRepository.findOne({
      where: { userId: dto.userId, year: dto.year, month: dto.month },
    });

    if (existing) {
      existing.count = dto.count;
      existing.marker = dto.marker ?? null;
      existing.notes = dto.notes ?? null;
      existing.createdById = actor.id; // last editor
      return this.noteRepository.save(existing);
    }

    const created = this.noteRepository.create({
      userId: dto.userId,
      year: dto.year,
      month: dto.month,
      count: dto.count,
      marker: dto.marker ?? null,
      notes: dto.notes ?? null,
      createdById: actor.id,
    });
    return this.noteRepository.save(created);
  }

  /**
   * Delete a single (user, year, month) cell.
   */
  async deleteCell(
    actor: User,
    userId: string,
    year: number,
    month: number,
  ): Promise<{ deleted: boolean }> {
    await this.assertCanEdit(actor);
    const result = await this.noteRepository.delete({ userId, year, month });
    return { deleted: (result.affected ?? 0) > 0 };
  }

  private async assertCanEdit(actor: User): Promise<void> {
    if (isAdminOrAbove(actor.role) || actor.role === UserRole.MANAGER) return;
    // USER role: must be in Parcometre department
    const dept = actor.departmentId
      ? await this.departmentRepository.findOne({ where: { id: actor.departmentId } })
      : null;
    if (
      dept &&
      removeDiacritics(dept.name) === PARCOMETRE_DEPARTMENT_NAME
    ) {
      return;
    }
    throw new ForbiddenException(
      'Doar departamentul Parcometre si administratorii pot modifica notele de constatare',
    );
  }

  private buildMonthsMeta(year: number, _ignored: number[]): Array<{
    month: number;
    label: string;
    totalDays: number;
    weekendDays: number;
    holidayDays: number;
    workingDays: number;
    holidayDates: string[];
    totalCount: number;
  }> {
    return MONTH_LABELS.map((label, i) => {
      const m = i + 1;
      const meta = workingDaysInMonth(year, m);
      return {
        month: m,
        label,
        totalDays: meta.totalDays,
        weekendDays: meta.weekendDays,
        holidayDays: meta.holidayDays,
        workingDays: meta.workingDays,
        holidayDates: meta.holidayDates,
        totalCount: 0,
      };
    });
  }
}
