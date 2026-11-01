import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WorkSchedule } from './entities/work-schedule.entity';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';
import { ShiftType } from './entities/shift-type.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import { isWorkingDay } from '../daily-reports/constants/romanian-holidays';
import {
  PROCESE_VERBALE_DEPARTMENT_NAME,
  ACHIZITII_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
  HANDICAP_PARKING_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
} from '../parking/constants/parking.constants';

/**
 * Precompleteaza automat programul de lucru (07:30-15:30) pentru angajatii din
 * departamentele de birou, in fiecare zi lucratoare care NU este sarbatoare legala.
 *
 * Nu suprascrie nimic: sare peste zilele in care angajatul are deja o asignare (facuta
 * manual de admin) sau este in concediu aprobat. Idempotent (poate rula de mai multe ori).
 */
@Injectable()
export class OfficeSchedulePrefillService {
  private readonly logger = new Logger(OfficeSchedulePrefillService.name);

  private readonly OFFICE_DEPARTMENTS = [
    PROCESE_VERBALE_DEPARTMENT_NAME,
    ACHIZITII_DEPARTMENT_NAME,
    PARCOMETRE_DEPARTMENT_NAME,
    HANDICAP_PARKING_DEPARTMENT_NAME,
    DOMICILIU_PARKING_DEPARTMENT_NAME,
  ];

  /** Pozitia de lucru generica "Program" (PRG), vezi migratia 1771600000000. */
  private readonly PROGRAM_POSITION_ID = '00000000-0000-0000-0000-000000000004';

  constructor(
    @InjectRepository(WorkSchedule)
    private readonly scheduleRepository: Repository<WorkSchedule>,
    @InjectRepository(ScheduleAssignment)
    private readonly assignmentRepository: Repository<ScheduleAssignment>,
    @InjectRepository(ShiftType)
    private readonly shiftTypeRepository: Repository<ShiftType>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
  ) {}

  private pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  private dateToStr(v: unknown): string {
    return (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);
  }

  /** Anul/luna curente pe fusul Europe/Bucharest. */
  getCurrentBucharestYearMonth(): { year: number; month: number } {
    const ds = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
    const [year, month] = ds.split('-').map(Number);
    return { year, month };
  }

  /**
   * Precompleteaza programul de birou pentru luna/anul date.
   * @returns numarul de asignari create si de angajati vizati.
   */
  async prefillMonth(year: number, month: number): Promise<{ created: number; users: number }> {
    // 1. Angajatii activi din departamentele de birou (USER + MANAGER, fara admini)
    const users = await this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.department', 'd')
      .where('u.isActive = true')
      .andWhere('u.role IN (:...roles)', { roles: [UserRole.USER, UserRole.MANAGER] })
      .andWhere('d.name IN (:...depts)', { depts: this.OFFICE_DEPARTMENTS })
      .getMany();

    if (users.length === 0) {
      return { created: 0, users: 0 };
    }

    // 2. Tipul de tura 8h 07:30-15:30 (fallback: orice tura de 8h)
    const shiftType =
      (await this.shiftTypeRepository.findOne({
        where: { shiftPattern: 'SHIFT_8H', startTime: '07:30:00' },
      })) ||
      (await this.shiftTypeRepository
        .createQueryBuilder('st')
        .where('st.shiftPattern = :p', { p: 'SHIFT_8H' })
        .andWhere('st.durationHours = 8')
        .orderBy('st.displayOrder', 'ASC')
        .getOne());

    if (!shiftType) {
      this.logger.warn('[Prefill birou] Nu exista un tip de tura de 8h — nu pot precompleta.');
      return { created: 0, users: users.length };
    }

    // 3. Zilele lucratoare din luna (exclude weekend + sarbatori legale)
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${this.pad(month)}-${this.pad(d)}`;
      if (isWorkingDay(ds)) workingDays.push(ds);
    }
    if (workingDays.length === 0) {
      return { created: 0, users: users.length };
    }

    const firstDay = `${year}-${this.pad(month)}-01`;
    const lastDay = `${year}-${this.pad(month)}-${this.pad(daysInMonth)}`;
    const userIds = users.map((u) => u.id);

    // 4. Asignarile deja existente ale acestor useri in luna (orice program) — nu le atingem
    const existing = await this.assignmentRepository
      .createQueryBuilder('sa')
      .select('sa.userId', 'userId')
      .addSelect('sa.shiftDate', 'shiftDate')
      .where('sa.userId IN (:...userIds)', { userIds })
      .andWhere('sa.shiftDate BETWEEN :f AND :l', { f: firstDay, l: lastDay })
      .getRawMany();
    const existingSet = new Set(existing.map((r) => `${r.userId}|${this.dateToStr(r.shiftDate)}`));

    // 5. Concediile aprobate care se suprapun cu luna
    const leaves = await this.leaveRequestRepository
      .createQueryBuilder('lr')
      .where('lr.userId IN (:...userIds)', { userIds })
      .andWhere('lr.status = :s', { s: 'APPROVED' })
      .andWhere('lr.startDate <= :l', { l: lastDay })
      .andWhere('lr.endDate >= :f', { f: firstDay })
      .getMany();
    const leaveByUser = new Map<string, Array<{ s: string; e: string }>>();
    for (const lr of leaves) {
      const arr = leaveByUser.get(lr.userId) || [];
      arr.push({ s: this.dateToStr(lr.startDate), e: this.dateToStr(lr.endDate) });
      leaveByUser.set(lr.userId, arr);
    }
    const isOnLeave = (uid: string, ds: string): boolean =>
      (leaveByUser.get(uid) || []).some((r) => ds >= r.s && ds <= r.e);

    // 6. Gaseste/creeaza programul APROBAT dedicat precompletarii de birou pe luna respectiva
    const monthName = new Date(year, month - 1).toLocaleDateString('ro-RO', {
      month: 'long',
      year: 'numeric',
    });
    const name = `Program birou ${monthName}`;
    let schedule = await this.scheduleRepository.findOne({
      where: { month, year, name, status: 'APPROVED' },
    });
    if (!schedule) {
      const creatorId = await this.resolveCreatorId(users[0].id);
      schedule = await this.scheduleRepository.save(
        this.scheduleRepository.create({
          name,
          month,
          year,
          shiftPattern: 'SHIFT_8H',
          createdBy: creatorId,
          status: 'APPROVED',
        }),
      );
    }

    // 7. Construieste asignarile lipsa (zile lucratoare, fara concediu, fara asignare existenta)
    const toCreate: Array<Record<string, unknown>> = [];
    for (const u of users) {
      for (const ds of workingDays) {
        if (existingSet.has(`${u.id}|${ds}`)) continue;
        if (isOnLeave(u.id, ds)) continue;
        toCreate.push({
          workScheduleId: schedule.id,
          userId: u.id,
          shiftTypeId: shiftType.id,
          shiftDate: ds,
          isRestDay: false,
          notes: 'Program auto',
          workPositionId: this.PROGRAM_POSITION_ID,
        });
      }
    }

    if (toCreate.length > 0) {
      // Insert in loturi, cu ON CONFLICT DO NOTHING (robust la constrangerea unica user+data)
      const CHUNK = 500;
      for (let i = 0; i < toCreate.length; i += CHUNK) {
        const chunk = toCreate.slice(i, i + CHUNK);
        await this.assignmentRepository
          .createQueryBuilder()
          .insert()
          .into(ScheduleAssignment)
          .values(chunk as any)
          .orIgnore()
          .execute();
      }
    }

    this.logger.log(
      `[Prefill birou] ${year}-${this.pad(month)}: ${toCreate.length} asignari create pentru ${users.length} angajati de birou`,
    );
    return { created: toCreate.length, users: users.length };
  }

  /** Alege un admin ca "creator" al programului; cade pe un fallback daca nu gaseste. */
  private async resolveCreatorId(fallbackId: string): Promise<string> {
    const admin = await this.userRepository.findOne({
      where: { role: In([UserRole.ADMIN, UserRole.MASTER_ADMIN]), isActive: true },
      select: ['id'],
    });
    return admin?.id || fallbackId;
  }
}
