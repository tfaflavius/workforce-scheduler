import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WorkSchedule } from './entities/work-schedule.entity';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';
import { ShiftType } from './entities/shift-type.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import { isWorkingDay } from '../daily-reports/constants/romanian-holidays';
import { ScheduleTimeRequest } from './entities/schedule-time-request.entity';
import { autoNote, DEFAULT_OFFICE_START, endOf8h } from './auto-schedule.constants';
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
    @InjectRepository(ScheduleTimeRequest)
    private readonly timeRequestRepository: Repository<ScheduleTimeRequest>,
  ) {}

  /** Are program fix automat: departament de birou sau ora setata individual. */
  isAutoScheduleUser(user: {
    autoScheduleStart?: string | null;
    department?: { name?: string } | null;
  }) {
    return (
      !!user.autoScheduleStart || this.OFFICE_DEPARTMENTS.includes(user.department?.name || '')
    );
  }

  /** Ora obisnuita de inceput a programului automat al omului. */
  defaultStartFor(user: { autoScheduleStart?: string | null }): string {
    return user.autoScheduleStart || DEFAULT_OFFICE_START;
  }

  /** Data de azi (Europe/Bucharest), YYYY-MM-DD. */
  todayStr(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' });
  }

  /** Tipul de tura de 8h care incepe la `start`; il creeaza daca lipseste. */
  async shiftTypeFor(start: string): Promise<ShiftType | null> {
    const found = await this.shiftTypeRepository.findOne({
      where: { shiftPattern: 'SHIFT_8H', startTime: `${start}:00` },
    });
    if (found) return found;
    const end = endOf8h(start);
    try {
      return await this.shiftTypeRepository.save(
        this.shiftTypeRepository.create({
          name: `Zi ${start}-${end}`,
          shiftPattern: 'SHIFT_8H',
          startTime: `${start}:00`,
          endTime: `${end}:00`,
          durationHours: 8,
          isNightShift: false,
        }),
      );
    } catch (err) {
      this.logger.warn(`[Prefill] Nu pot crea tura ${start}-${end}: ${err?.message}`);
      return null;
    }
  }

  /** Programul APROBAT dedicat precompletarii pe luna (il creeaza daca lipseste). */
  async monthSchedule(
    year: number,
    month: number,
    fallbackCreatorId: string,
  ): Promise<WorkSchedule> {
    const monthName = new Date(year, month - 1).toLocaleDateString('ro-RO', {
      month: 'long',
      year: 'numeric',
    });
    const name = `Program birou ${monthName}`;
    const existing = await this.scheduleRepository.findOne({
      where: { month, year, name, status: 'APPROVED' },
    });
    if (existing) return existing;
    const creatorId = await this.resolveCreatorId(fallbackCreatorId);
    return this.scheduleRepository.save(
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

  private pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  private dateToStr(v: unknown): string {
    // Coloanele "date" vin din driver ca Date la miezul noptii LOCAL: folosim componentele
    // locale (toISOString ar muta ziua inapoi pe un server care nu e pe UTC).
    if (v instanceof Date) {
      return `${v.getFullYear()}-${this.pad(v.getMonth() + 1)}-${this.pad(v.getDate())}`;
    }
    return String(v).slice(0, 10);
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
      .andWhere('(d.name IN (:...depts) OR u.autoScheduleStart IS NOT NULL)', {
        depts: this.OFFICE_DEPARTMENTS,
      })
      .getMany();

    if (users.length === 0) {
      return { created: 0, users: 0 };
    }

    // 2. Tipurile de tura de 8h, dupa ora de inceput (07:30 implicit, 08:00 etc.)
    const shiftCache = new Map<string, ShiftType | null>();
    const shiftFor = async (start: string) => {
      if (!shiftCache.has(start)) shiftCache.set(start, await this.shiftTypeFor(start));
      return shiftCache.get(start)!;
    };
    if (!(await shiftFor(DEFAULT_OFFICE_START))) {
      this.logger.warn('[Prefill birou] Nu exista un tip de tura de 8h — nu pot precompleta.');
      return { created: 0, users: users.length };
    }

    // 3. Zilele lucratoare din luna (exclude weekend + sarbatori legale)
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = this.todayStr();
    const workingDays: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${this.pad(month)}-${this.pad(d)}`;
      // In luna curenta nu completam zilele trecute (doar de azi inainte)
      if (isWorkingDay(ds) && ds >= today) workingDays.push(ds);
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
      .addSelect('sa.notes', 'notes')
      .where('sa.userId IN (:...userIds)', { userIds })
      .andWhere('sa.shiftDate BETWEEN :f AND :l', { f: firstDay, l: lastDay })
      .getRawMany();
    const existingSet = new Set(existing.map((r) => `${r.userId}|${this.dateToStr(r.shiftDate)}`));
    // Cei cu program fix individual (nu din departamentele de birou) care au deja un program
    // facut manual in luna asta: nu completam nimic peste (zilele goale pot fi libere date de manager)
    const manualMonth = new Set(
      existing
        .filter((r) => !String(r.notes || '').startsWith('Program auto'))
        .map((r) => r.userId as string),
    );
    const skipUser = (u: User) =>
      !this.OFFICE_DEPARTMENTS.includes(u.department?.name || '') && manualMonth.has(u.id);

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

    // 6. Cererile aprobate de alta ora care se suprapun cu luna
    const timeRequests = await this.timeRequestRepository
      .createQueryBuilder('tr')
      .where('tr.userId IN (:...userIds)', { userIds })
      .andWhere('tr.status = :s', { s: 'APPROVED' })
      .andWhere('tr.startDate <= :l', { l: lastDay })
      .andWhere('tr.endDate >= :f', { f: firstDay })
      .orderBy('tr.reviewedAt', 'ASC')
      .getMany();
    const startOn = (u: User, ds: string): string => {
      let start = this.defaultStartFor(u);
      for (const tr of timeRequests) {
        if (
          tr.userId === u.id &&
          ds >= this.dateToStr(tr.startDate) &&
          ds <= this.dateToStr(tr.endDate)
        ) {
          start = tr.startTime; // ultima aprobata castiga
        }
      }
      return start;
    };

    // Programul APROBAT dedicat precompletarii pe luna respectiva
    const schedule = await this.monthSchedule(year, month, users[0].id);

    // 7. Construieste asignarile lipsa (zile lucratoare, fara concediu, fara asignare existenta)
    const toCreate: Array<Record<string, unknown>> = [];
    for (const u of users) {
      if (skipUser(u)) continue;
      for (const ds of workingDays) {
        if (existingSet.has(`${u.id}|${ds}`)) continue;
        if (isOnLeave(u.id, ds)) continue;
        let start = startOn(u, ds);
        let st = await shiftFor(start);
        if (!st) {
          start = DEFAULT_OFFICE_START;
          st = (await shiftFor(start))!;
        }
        toCreate.push({
          workScheduleId: schedule.id,
          userId: u.id,
          shiftTypeId: st.id,
          shiftDate: ds,
          isRestDay: false,
          notes: autoNote(start),
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

  /**
   * Aplica o cerere aprobata de alta ora: in zilele lucratoare din interval (de azi inainte,
   * fara concediu) programul automat al omului trece pe noua ora. Zilele fara program primesc
   * unul nou; zilele cu program pus manual de manager/admin nu se ating.
   */
  async applyTimeRequest(
    req: ScheduleTimeRequest,
  ): Promise<{ updated: number; created: number; skipped: number }> {
    const st = await this.shiftTypeFor(req.startTime);
    if (!st) throw new Error('Nu exista tura pentru ora ceruta');
    const today = this.todayStr();
    const from = this.dateToStr(req.startDate);
    const to = this.dateToStr(req.endDate);

    const leaves = await this.leaveRequestRepository
      .createQueryBuilder('lr')
      .where('lr.userId = :u', { u: req.userId })
      .andWhere('lr.status = :s', { s: 'APPROVED' })
      .andWhere('lr.startDate <= :to', { to })
      .andWhere('lr.endDate >= :from', { from })
      .getMany();
    const onLeave = (ds: string) =>
      leaves.some((l) => ds >= this.dateToStr(l.startDate) && ds <= this.dateToStr(l.endDate));

    let updated = 0;
    let created = 0;
    let skipped = 0;
    const d = new Date(`${from}T12:00:00Z`);
    const end = new Date(`${to}T12:00:00Z`);
    for (; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      if (ds < today || !isWorkingDay(ds) || onLeave(ds)) continue;
      const existing = await this.assignmentRepository.find({
        where: { userId: req.userId, shiftDate: ds as any },
      });
      if (existing.length === 0) {
        const [y, m] = ds.split('-').map(Number);
        const schedule = await this.monthSchedule(y, m, req.reviewedBy || req.userId);
        await this.assignmentRepository
          .createQueryBuilder()
          .insert()
          .into(ScheduleAssignment)
          .values({
            workScheduleId: schedule.id,
            userId: req.userId,
            shiftTypeId: st.id,
            shiftDate: ds,
            isRestDay: false,
            notes: autoNote(req.startTime),
            workPositionId: this.PROGRAM_POSITION_ID,
          } as any)
          .orIgnore()
          .execute();
        created++;
        continue;
      }
      const auto = existing.filter((a) => (a.notes || '').startsWith('Program auto'));
      if (auto.length === 0) {
        skipped++;
        continue;
      }
      for (const a of auto) {
        await this.assignmentRepository.update(a.id, {
          shiftTypeId: st.id,
          notes: autoNote(req.startTime),
        });
        updated++;
      }
    }
    return { updated, created, skipped };
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
