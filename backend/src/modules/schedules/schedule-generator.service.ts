import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

// Shift patterns for schedule generation (not persisted on User entity)
enum ShiftPattern {
  SHIFT_12H = 'SHIFT_12H',
  SHIFT_8H_FIXED = 'SHIFT_8H_FIXED',
  SHIFT_8H_ROTATING = 'SHIFT_8H_ROTATING',
}
import { ShiftType } from './entities/shift-type.entity';
import { WorkPosition } from './entities/work-position.entity';
import { WorkSchedule } from './entities/work-schedule.entity';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import { LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

// Tipuri pentru generare
interface GeneratedAssignment {
  userId: string;
  shiftDate: string; // YYYY-MM-DD
  shiftTypeId: string;
  workPositionId: string;
  notes: string;
}

interface UserScheduleState {
  lastShiftDate: Date | null;
  lastShiftType: 'DAY_12' | 'NIGHT_12' | 'DAY_8' | null;
  totalHoursThisMonth: number;
  workingDays: string[]; // Zilele in care a lucrat
}

export interface GenerationResult {
  assignments: GeneratedAssignment[];
  warnings: string[];
  stats: {
    totalAssignments: number;
    usersScheduled: number;
    replacementsNeeded: number;
    replacementsFound: number;
  };
}

@Injectable()
export class ScheduleGeneratorService {
  private readonly logger = new Logger(ScheduleGeneratorService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ShiftType)
    private readonly shiftTypeRepository: Repository<ShiftType>,
    @InjectRepository(WorkPosition)
    private readonly workPositionRepository: Repository<WorkPosition>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(WorkSchedule)
    private readonly workScheduleRepository: Repository<WorkSchedule>,
    @InjectRepository(ScheduleAssignment)
    private readonly scheduleAssignmentRepository: Repository<ScheduleAssignment>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Genereaza automat programul pentru o luna
   */
  async generateSchedule(monthYear: string): Promise<GenerationResult> {
    this.logger.log(`Starting schedule generation for ${monthYear}`);

    const [year, month] = monthYear.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDaysCount = this.countWorkingDays(year, month);
    const monthlyHoursLimit = workingDaysCount * 8;

    this.logger.log(`Month has ${daysInMonth} days, ${workingDaysCount} working days, limit: ${monthlyHoursLimit}h`);

    // Incarca datele necesare
    const [users, shiftTypes, workPositions, approvedLeaves] = await Promise.all([
      this.loadUsers(),
      this.loadShiftTypes(),
      this.loadWorkPositions(),
      this.loadApprovedLeaves(year, month),
    ]);

    // Categoriseste utilizatorii bazat pe shiftPattern (cast deoarece proprietatea nu e pe entity)
    const dispecerat12H = users.filter(u => (u as any).shiftPattern === ShiftPattern.SHIFT_12H);
    const dispecerat8HFixed = users.filter(u => (u as any).shiftPattern === ShiftPattern.SHIFT_8H_FIXED);
    const controlUsers = users.filter(u => (u as any).shiftPattern === ShiftPattern.SHIFT_8H_ROTATING);

    this.logger.log(`Users by shiftPattern: SHIFT_12H: ${dispecerat12H.length}, SHIFT_8H_FIXED: ${dispecerat8HFixed.length}, SHIFT_8H_ROTATING: ${controlUsers.length}`);

    const assignments: GeneratedAssignment[] = [];
    const warnings: string[] = [];
    const userStates: Map<string, UserScheduleState> = new Map();

    // Initializeaza starea pentru fiecare utilizator
    users.forEach(user => {
      userStates.set(user.id, {
        lastShiftDate: null,
        lastShiftType: null,
        totalHoursThisMonth: 0,
        workingDays: [],
      });
    });

    // Mapare concedii pe zile
    const leaveDaysMap = this.buildLeaveDaysMap(approvedLeaves);

    // Gaseste shift types
    const shiftTypeMap = this.buildShiftTypeMap(shiftTypes);
    const workPositionMap = this.buildWorkPositionMap(workPositions);

    // 1. Genereaza program pentru Dispecerat 12H
    const dispecerat12HAssignments = this.generateDispeceratT12HSchedule(
      dispecerat12H,
      year,
      month,
      daysInMonth,
      monthlyHoursLimit,
      userStates,
      leaveDaysMap,
      shiftTypeMap,
      workPositionMap,
      warnings,
    );
    assignments.push(...dispecerat12HAssignments);

    // 2. Genereaza program pentru Dispecerat 8H Fix (07:30-15:30)
    const dispecerat8HAssignments = this.generateDispeceratT8HSchedule(
      dispecerat8HFixed,
      year,
      month,
      daysInMonth,
      monthlyHoursLimit,
      userStates,
      leaveDaysMap,
      shiftTypeMap,
      workPositionMap,
      warnings,
    );
    assignments.push(...dispecerat8HAssignments);

    // 3. Genereaza program pentru Control
    const controlAssignments = this.generateControlSchedule(
      controlUsers,
      year,
      month,
      daysInMonth,
      monthlyHoursLimit,
      userStates,
      leaveDaysMap,
      shiftTypeMap,
      workPositionMap,
      warnings,
    );
    assignments.push(...controlAssignments);

    // 4. Inlocuieste pentru concedii
    const replacementStats = await this.handleLeaveReplacements(
      assignments,
      leaveDaysMap,
      dispecerat12H,
      controlUsers,
      userStates,
      monthlyHoursLimit,
      shiftTypeMap,
      workPositionMap,
      warnings,
    );

    this.logger.log(`Generation complete: ${assignments.length} assignments created`);

    return {
      assignments,
      warnings,
      stats: {
        totalAssignments: assignments.length,
        usersScheduled: new Set(assignments.map(a => a.userId)).size,
        replacementsNeeded: replacementStats.needed,
        replacementsFound: replacementStats.found,
      },
    };
  }

  /**
   * Genereaza program pentru Dispecerat 12H
   * Reguli:
   * - Fiecare angajat are un ciclu de 4 zile: ZI → NOAPTE → LIBER → LIBER
   * - 2 angajati pe fiecare tura in fiecare zi
   * - Angajatii sunt distribuiti in faze diferite pentru a asigura acoperirea
   * - Nu depaseste limita lunara de ore
   */
  private generateDispeceratT12HSchedule(
    users: User[],
    year: number,
    month: number,
    daysInMonth: number,
    monthlyHoursLimit: number,
    userStates: Map<string, UserScheduleState>,
    leaveDaysMap: Map<string, Set<string>>,
    shiftTypeMap: Map<string, string>,
    workPositionMap: Map<string, string>,
    warnings: string[],
  ): GeneratedAssignment[] {
    const assignments: GeneratedAssignment[] = [];

    if (users.length < 8) {
      warnings.push(`Dispecerat 12H: Sunt doar ${users.length} angajati, minim 8 necesari pentru 2 pe ZI + 2 pe NOAPTE cu ciclu de 4 zile`);
    }

    const dayShiftId = shiftTypeMap.get('Zi 07-19');
    const nightShiftId = shiftTypeMap.get('Noapte 19-07');
    const dispeceratPositionId = workPositionMap.get('Dispecerat');

    if (!dayShiftId || !nightShiftId) {
      warnings.push('Dispecerat 12H: Nu s-au gasit tipurile de tura Zi 07-19 sau Noapte 19-07');
      return assignments;
    }

    this.logger.log(`Generating 12H schedule for ${users.length} users`);

    // Ciclul de 4 zile: 0=ZI, 1=NOAPTE, 2=LIBER, 3=LIBER
    // Pentru a avea 2 pe ZI si 2 pe NOAPTE in fiecare zi, avem nevoie de 8 utilizatori
    // distribuiti in 4 grupe de cate 2:
    // Grupa A (users 0,1): cycleStart = 0 → ZI in ziua 1
    // Grupa B (users 2,3): cycleStart = 1 → NOAPTE in ziua 1
    // Grupa C (users 4,5): cycleStart = 2 → LIBER in ziua 1, ZI in ziua 3
    // Grupa D (users 6,7): cycleStart = 3 → LIBER in ziua 1, NOAPTE in ziua 3

    const userCycleStart: Map<string, number> = new Map();
    users.forEach((user, index) => {
      // Imparte in grupe de 2 si distribuie pe fazele ciclului
      const groupIndex = Math.floor(index / 2) % 4;
      userCycleStart.set(user.id, groupIndex);
      this.logger.debug(`User ${user.fullName} starts at cycle day ${groupIndex}`);
    });

    // Pentru fiecare zi a lunii
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatDate(year, month, day);

      // Calculeaza in ce zi a ciclului suntem pentru fiecare utilizator
      // Ziua 1 a lunii = ziua 0 din perspectiva ciclului
      const cycleDayOfMonth = (day - 1) % 4;

      const dayShiftAssigned: string[] = [];
      const nightShiftAssigned: string[] = [];

      for (const user of users) {
        const state = userStates.get(user.id)!;
        const cycleStart = userCycleStart.get(user.id)!;

        // Calculeaza in ce faza a ciclului personal e acest user in aceasta zi
        const userCycleDay = (cycleStart + day - 1) % 4;

        // Verifica daca e in concediu
        const userLeaves = leaveDaysMap.get(user.id);
        if (userLeaves?.has(dateStr)) {
          continue;
        }

        // Verifica limita de ore
        if (state.totalHoursThisMonth + 12 > monthlyHoursLimit) {
          continue;
        }

        // Determina ce face in aceasta zi bazat pe ciclul sau personal
        if (userCycleDay === 0 && dayShiftAssigned.length < 2) {
          // Ziua 1 din ciclu: Tura de ZI
          assignments.push({
            userId: user.id,
            shiftDate: dateStr,
            shiftTypeId: dayShiftId,
            workPositionId: dispeceratPositionId || '',
            notes: 'Zi 07:00-19:00',
          });
          state.totalHoursThisMonth += 12;
          state.workingDays.push(dateStr);
          state.lastShiftDate = new Date(year, month - 1, day);
          state.lastShiftType = 'DAY_12';
          dayShiftAssigned.push(user.id);
        } else if (userCycleDay === 1 && nightShiftAssigned.length < 2) {
          // Ziua 2 din ciclu: Tura de NOAPTE
          assignments.push({
            userId: user.id,
            shiftDate: dateStr,
            shiftTypeId: nightShiftId,
            workPositionId: dispeceratPositionId || '',
            notes: 'Noapte 19:00-07:00',
          });
          state.totalHoursThisMonth += 12;
          state.workingDays.push(dateStr);
          state.lastShiftDate = new Date(year, month - 1, day);
          state.lastShiftType = 'NIGHT_12';
          nightShiftAssigned.push(user.id);
        }
        // userCycleDay 2 sau 3 = LIBER (48h odihna)
      }

      // Fallback: Incearca sa gaseasca inlocuitori daca nu avem destui
      if (dayShiftAssigned.length < 2) {
        for (const user of users) {
          if (dayShiftAssigned.length >= 2) break;
          if (dayShiftAssigned.includes(user.id)) continue;
          if (nightShiftAssigned.includes(user.id)) continue;

          const state = userStates.get(user.id)!;
          const userLeaves = leaveDaysMap.get(user.id);

          if (userLeaves?.has(dateStr)) continue;
          if (state.totalHoursThisMonth + 12 > monthlyHoursLimit) continue;

          // Verifica daca a avut noapte recent (minim 48h pauza)
          if (state.lastShiftDate && state.lastShiftType === 'NIGHT_12') {
            const hoursSince = this.getHoursDifference(state.lastShiftDate, new Date(year, month - 1, day));
            if (hoursSince < 48) continue;
          }

          assignments.push({
            userId: user.id,
            shiftDate: dateStr,
            shiftTypeId: dayShiftId,
            workPositionId: dispeceratPositionId || '',
            notes: 'Zi 07:00-19:00',
          });
          state.totalHoursThisMonth += 12;
          state.workingDays.push(dateStr);
          state.lastShiftDate = new Date(year, month - 1, day);
          state.lastShiftType = 'DAY_12';
          dayShiftAssigned.push(user.id);
        }
      }

      if (nightShiftAssigned.length < 2) {
        for (const user of users) {
          if (nightShiftAssigned.length >= 2) break;
          if (dayShiftAssigned.includes(user.id)) continue;
          if (nightShiftAssigned.includes(user.id)) continue;

          const state = userStates.get(user.id)!;
          const userLeaves = leaveDaysMap.get(user.id);

          if (userLeaves?.has(dateStr)) continue;
          if (state.totalHoursThisMonth + 12 > monthlyHoursLimit) continue;

          // Verifica pauza de 48h dupa noapte anterioara
          if (state.lastShiftDate && state.lastShiftType === 'NIGHT_12') {
            const hoursSince = this.getHoursDifference(state.lastShiftDate, new Date(year, month - 1, day));
            if (hoursSince < 48) continue;
          }

          assignments.push({
            userId: user.id,
            shiftDate: dateStr,
            shiftTypeId: nightShiftId,
            workPositionId: dispeceratPositionId || '',
            notes: 'Noapte 19:00-07:00',
          });
          state.totalHoursThisMonth += 12;
          state.workingDays.push(dateStr);
          state.lastShiftDate = new Date(year, month - 1, day);
          state.lastShiftType = 'NIGHT_12';
          nightShiftAssigned.push(user.id);
        }
      }

      // Avertismente daca nu s-au gasit suficienti
      if (dayShiftAssigned.length < 2) {
        warnings.push(`${dateStr}: Doar ${dayShiftAssigned.length}/2 angajati pentru tura de zi Dispecerat`);
      }
      if (nightShiftAssigned.length < 2) {
        warnings.push(`${dateStr}: Doar ${nightShiftAssigned.length}/2 angajati pentru tura de noapte Dispecerat`);
      }
    }

    return assignments;
  }

  /**
   * Genereaza program pentru Dispecerat 8H (07:30-15:30)
   * Lucreaza doar in zilele lucratoare
   */
  private generateDispeceratT8HSchedule(
    users: User[],
    year: number,
    month: number,
    daysInMonth: number,
    monthlyHoursLimit: number,
    userStates: Map<string, UserScheduleState>,
    leaveDaysMap: Map<string, Set<string>>,
    shiftTypeMap: Map<string, string>,
    workPositionMap: Map<string, string>,
    warnings: string[],
  ): GeneratedAssignment[] {
    const assignments: GeneratedAssignment[] = [];

    const shiftId = shiftTypeMap.get('Zi 07:30-15:30');
    const dispeceratPositionId = workPositionMap.get('Dispecerat');

    if (!shiftId) {
      warnings.push('Dispecerat 8H: Nu s-a gasit tipul de tura Zi 07:30-15:30');
      return assignments;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatDate(year, month, day);
      const dayOfWeek = new Date(year, month - 1, day).getDay();

      // Doar zile lucratoare (Luni-Vineri)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      for (const user of users) {
        const state = userStates.get(user.id)!;

        // Verifica concediu
        const userLeaves = leaveDaysMap.get(user.id);
        if (userLeaves?.has(dateStr)) continue;

        // Verifica limita de ore
        if (state.totalHoursThisMonth + 8 > monthlyHoursLimit) continue;

        assignments.push({
          userId: user.id,
          shiftDate: dateStr,
          shiftTypeId: shiftId,
          workPositionId: dispeceratPositionId || '',
          notes: `Zi 07:30-15:30`,
        });

        state.totalHoursThisMonth += 8;
        state.workingDays.push(dateStr);
      }
    }

    return assignments;
  }

  /**
   * Genereaza program pentru Control cu rotatie saptamanala
   * Lucreaza in fiecare zi a lunii, rotatie: Z3 → Z5 → Z4 → Z6
   */
  private generateControlSchedule(
    users: User[],
    year: number,
    month: number,
    daysInMonth: number,
    monthlyHoursLimit: number,
    userStates: Map<string, UserScheduleState>,
    leaveDaysMap: Map<string, Set<string>>,
    shiftTypeMap: Map<string, string>,
    workPositionMap: Map<string, string>,
    warnings: string[],
  ): GeneratedAssignment[] {
    const assignments: GeneratedAssignment[] = [];

    // Turele in ordinea rotatiei
    const shiftRotation = [
      { name: 'Zi 07:30-15:30', notes: 'Zi 07:30-15:30' },
      { name: 'Zi 08-16', notes: 'Zi 08:00-16:00' },
      { name: 'Zi 09-17', notes: 'Zi 09:00-17:00' },
      { name: 'Zi 13-21', notes: 'Zi 13:00-21:00' },
    ];

    const controlPositionId = workPositionMap.get('Control');

    // Pentru fiecare utilizator, determina cu ce tura incepe
    const userShiftIndex: Map<string, number> = new Map();
    users.forEach((user, index) => {
      userShiftIndex.set(user.id, index % shiftRotation.length);
    });

    let currentWeek = 0;
    let lastWeekStart = 1;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatDate(year, month, day);
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      // Detecteaza inceputul unei saptamani noi (Luni)
      if (dayOfWeek === 1 && day > 1) {
        currentWeek++;
        // Roteste turele pentru fiecare utilizator
        users.forEach(user => {
          const currentIndex = userShiftIndex.get(user.id)!;
          userShiftIndex.set(user.id, (currentIndex + 1) % shiftRotation.length);
        });
      }

      for (const user of users) {
        const state = userStates.get(user.id)!;

        // Verifica concediu
        const userLeaves = leaveDaysMap.get(user.id);
        if (userLeaves?.has(dateStr)) continue;

        // Verifica limita de ore
        if (state.totalHoursThisMonth + 8 > monthlyHoursLimit) {
          continue;
        }

        const shiftIndex = userShiftIndex.get(user.id)!;
        const shift = shiftRotation[shiftIndex];
        const shiftId = shiftTypeMap.get(shift.name);

        if (!shiftId) {
          warnings.push(`Control: Nu s-a gasit tura ${shift.name}`);
          continue;
        }

        assignments.push({
          userId: user.id,
          shiftDate: dateStr,
          shiftTypeId: shiftId,
          workPositionId: controlPositionId || '',
          notes: shift.notes,
        });

        state.totalHoursThisMonth += 8;
        state.workingDays.push(dateStr);
      }
    }

    return assignments;
  }

  /**
   * Gestioneaza inlocuirile pentru concedii
   */
  private async handleLeaveReplacements(
    assignments: GeneratedAssignment[],
    leaveDaysMap: Map<string, Set<string>>,
    dispecerat12HUsers: User[],
    controlUsers: User[],
    userStates: Map<string, UserScheduleState>,
    monthlyHoursLimit: number,
    shiftTypeMap: Map<string, string>,
    workPositionMap: Map<string, string>,
    warnings: string[],
  ): Promise<{ needed: number; found: number }> {
    let needed = 0;
    let found = 0;

    // Gaseste zilele unde lipseste personal din cauza concediilor
    // si incearca sa gaseasca inlocuitori

    // Pentru simplitate, returnam statistici de baza
    // Implementarea completa ar analiza fiecare zi si ar cauta inlocuitori

    return { needed, found };
  }

  // ==================== HELPER METHODS ====================

  private async loadUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
      relations: ['department'],
    });
  }

  private async loadShiftTypes(): Promise<ShiftType[]> {
    return this.shiftTypeRepository.find();
  }

  private async loadWorkPositions(): Promise<WorkPosition[]> {
    return this.workPositionRepository.find();
  }

  private async loadApprovedLeaves(year: number, month: number): Promise<LeaveRequest[]> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    return this.leaveRequestRepository.find({
      where: {
        status: 'APPROVED',
        startDate: LessThanOrEqual(monthEnd),
        endDate: MoreThanOrEqual(monthStart),
      },
    });
  }

  private buildLeaveDaysMap(leaves: LeaveRequest[]): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();

    leaves.forEach(leave => {
      if (!map.has(leave.userId)) {
        map.set(leave.userId, new Set());
      }

      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      const current = new Date(startDate);

      while (current <= endDate) {
        const dayOfWeek = current.getDay();
        // Exclude weekenduri din concediu
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const dateStr = this.formatDateFromDate(current);
          map.get(leave.userId)!.add(dateStr);
        }
        current.setDate(current.getDate() + 1);
      }
    });

    return map;
  }

  private buildShiftTypeMap(shiftTypes: ShiftType[]): Map<string, string> {
    const map = new Map<string, string>();
    shiftTypes.forEach(st => {
      map.set(st.name, st.id);
    });
    return map;
  }

  private buildWorkPositionMap(positions: WorkPosition[]): Map<string, string> {
    const map = new Map<string, string>();
    positions.forEach(p => {
      map.set(p.name, p.id);
    });
    return map;
  }

  // Metodele de categorisire au fost inlocuite cu verificarea directa a shiftPattern

  private countWorkingDays(year: number, month: number): number {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }

    return workingDays;
  }

  private formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private formatDateFromDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private getHoursDifference(date1: Date, date2: Date): number {
    const diffMs = date2.getTime() - date1.getTime();
    return diffMs / (1000 * 60 * 60);
  }

  /**
   * Salveaza programul generat in baza de date
   */
  async saveGeneratedSchedule(monthYear: string, createdById: string): Promise<GenerationResult> {
    this.logger.log(`Saving generated schedule for ${monthYear}`);

    // Mai intai generam programul
    const result = await this.generateSchedule(monthYear);

    if (result.assignments.length === 0) {
      this.logger.warn('No assignments to save');
      return result;
    }

    const [year, month] = monthYear.split('-').map(Number);

    // Folosim o tranzactie pentru a salva totul
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verifica daca exista deja un program pentru aceasta luna
      let workSchedule = await queryRunner.manager.findOne(WorkSchedule, {
        where: {
          month,
          year,
          name: `Program Auto-Generat ${monthYear}`,
        },
      });

      if (workSchedule) {
        // Sterge asignarile existente pentru acest schedule
        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(ScheduleAssignment)
          .where('work_schedule_id = :scheduleId', { scheduleId: workSchedule.id })
          .execute();

        workSchedule.status = 'APPROVED';
        await queryRunner.manager.save(WorkSchedule, workSchedule);
        this.logger.log(`Updated existing schedule: ${workSchedule.id}`);
      } else {
        // Creeaza un nou program pentru toata luna
        workSchedule = queryRunner.manager.create(WorkSchedule, {
          name: `Program Auto-Generat ${monthYear}`,
          month,
          year,
          shiftPattern: 'MIXED',
          status: 'APPROVED',
          createdBy: createdById,
          approvedByAdmin: createdById,
          approvedAt: new Date(),
        });
        workSchedule = await queryRunner.manager.save(WorkSchedule, workSchedule);
        this.logger.log(`Created new schedule: ${workSchedule.id}`);
      }

      // Creeaza toate asignarile
      let savedCount = 0;
      for (const assignment of result.assignments) {
        const scheduleAssignment = queryRunner.manager.create(ScheduleAssignment, {
          workScheduleId: workSchedule.id,
          userId: assignment.userId,
          shiftDate: new Date(assignment.shiftDate),
          shiftTypeId: assignment.shiftTypeId,
          workPositionId: assignment.workPositionId || null,
          notes: assignment.notes,
          isRestDay: false,
        });
        await queryRunner.manager.save(ScheduleAssignment, scheduleAssignment);
        savedCount++;
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Successfully saved ${savedCount} assignments`);

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to save generated schedule', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
