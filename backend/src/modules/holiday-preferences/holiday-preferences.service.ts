import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { HolidayPeriod, HolidayPeriodKey } from './entities/holiday-period.entity';
import { HolidayChoice, HolidayPreference } from './entities/holiday-preference.entity';
import { HolidayMessage } from './entities/holiday-message.entity';
import { SaveHolidayPreferencesDto, UpdateHolidayPeriodDto } from './dto/holiday-preferences.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { ShiftType } from '../schedules/entities/shift-type.entity';
import { WorkSchedule } from '../schedules/entities/work-schedule.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { LeaveRequestsService } from '../leave-requests/leave-requests.service';
import { orthodoxEaster } from '../control-notes/utils/romanian-holidays';
import { DISPECERAT_DEPARTMENT_NAME } from '../parking/constants/parking.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';

const MANAGEMENT_ROLES: string[] = [UserRole.MANAGER, UserRole.ADMIN, UserRole.MASTER_ADMIN];
const DEFAULT_WORK_POSITION_ID = '00000000-0000-0000-0000-000000000001'; // Dispecerat

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
};
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

/** Toate zilele (YYYY-MM-DD) dintre start si end, inclusiv. */
export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = new Date(`${start}T00:00:00Z`); iso(d) <= end; d = addDays(d, 1)) out.push(iso(d));
  return out;
}

/** Perioadele implicite pentru un an. Revelion Y = 31.12.Y - 02.01.Y+1. */
export function defaultPeriods(
  year: number,
): Array<{ key: HolidayPeriodKey; name: string; startDate: string; endDate: string }> {
  const easter = orthodoxEaster(year);
  return [
    {
      key: 'PASTE',
      name: `Paste ${year}`,
      startDate: iso(addDays(easter, -2)), // Vinerea Mare
      endDate: iso(addDays(easter, 1)), // Lunea Pastelui
    },
    {
      key: 'CRACIUN',
      name: `Craciun ${year}`,
      startDate: iso(utc(year, 12, 24)),
      endDate: iso(utc(year, 12, 27)),
    },
    {
      key: 'REVELION',
      name: `Revelion ${year}-${year + 1}`,
      startDate: iso(utc(year, 12, 31)),
      endDate: iso(utc(year + 1, 1, 2)),
    },
  ];
}

@Injectable()
export class HolidayPreferencesService {
  private readonly logger = new Logger(HolidayPreferencesService.name);

  constructor(
    @InjectRepository(HolidayPeriod)
    private readonly periodRepo: Repository<HolidayPeriod>,
    @InjectRepository(HolidayPreference)
    private readonly prefRepo: Repository<HolidayPreference>,
    @InjectRepository(HolidayMessage)
    private readonly messageRepo: Repository<HolidayMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(ShiftType)
    private readonly shiftTypeRepo: Repository<ShiftType>,
    @InjectRepository(WorkSchedule)
    private readonly scheduleRepo: Repository<WorkSchedule>,
    @InjectRepository(ScheduleAssignment)
    private readonly assignmentRepo: Repository<ScheduleAssignment>,
    private readonly schedulesService: SchedulesService,
    private readonly leaveRequestsService: LeaveRequestsService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  // ============== ACCES ==============

  private isManagement(user: { role: string }) {
    return MANAGEMENT_ROLES.includes(user.role);
  }

  private async getDispeceratDepartment(): Promise<Department | null> {
    return this.departmentRepo.findOne({ where: { name: DISPECERAT_DEPARTMENT_NAME } });
  }

  private async assertCanView(requester: { id: string; role: string }): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: requester.id },
      relations: ['department'],
    });
    if (!user) throw new ForbiddenException();
    if (this.isManagement(user)) return user;
    if (user.department?.name === DISPECERAT_DEPARTMENT_NAME) return user;
    throw new ForbiddenException('Modulul de sarbatori este disponibil doar pentru Dispecerat');
  }

  // ============== PERIOADE ==============

  /** Creeaza (idempotent) perioadele pentru anul curent si urmatorul. */
  private async ensurePeriods(): Promise<void> {
    const year = new Date().getFullYear();
    for (const y of [year, year + 1]) {
      for (const p of defaultPeriods(y)) {
        await this.periodRepo
          .createQueryBuilder()
          .insert()
          .into(HolidayPeriod)
          .values({ ...p, year: y, status: 'OPEN' })
          .orIgnore()
          .execute();
      }
    }
  }

  async listPeriods(requester: { id: string; role: string }) {
    await this.assertCanView(requester);
    await this.ensurePeriods();
    // Perioadele care nu s-au terminat de mai mult de 30 de zile
    const cutoff = iso(addDays(new Date(), -30));
    const periods = await this.periodRepo
      .createQueryBuilder('p')
      .where('p.endDate >= :cutoff', { cutoff })
      .orderBy('p.startDate', 'ASC')
      .getMany();

    const counts = periods.length
      ? await this.prefRepo
          .createQueryBuilder('hp')
          .select('hp.periodId', 'periodId')
          .addSelect('COUNT(DISTINCT hp.userId)', 'users')
          .where('hp.periodId IN (:...ids)', { ids: periods.map((p) => p.id) })
          .groupBy('hp.periodId')
          .getRawMany()
      : [];
    const countMap = new Map(counts.map((c) => [c.periodId, Number(c.users)]));
    return periods.map((p) => ({ ...p, respondedUsers: countMap.get(p.id) || 0 }));
  }

  private async getPeriodOrFail(id: string): Promise<HolidayPeriod> {
    const period = await this.periodRepo.findOne({ where: { id } });
    if (!period) throw new NotFoundException('Perioada nu a fost gasita');
    return period;
  }

  async getPeriodDetails(id: string, requester: { id: string; role: string }) {
    const me = await this.assertCanView(requester);
    const period = await this.getPeriodOrFail(id);
    const dept = await this.getDispeceratDepartment();
    const users = dept
      ? await this.userRepo.find({
          // Doar dispecerii (USER) — managerul departamentului nu apare ca rand
          where: { departmentId: dept.id, isActive: true, role: UserRole.USER },
          select: ['id', 'fullName', 'role'],
          order: { fullName: 'ASC' },
        })
      : [];
    const preferences = await this.prefRepo.find({
      where: { periodId: id },
      select: ['id', 'userId', 'date', 'choice', 'note', 'updatedAt'],
    });
    return {
      period,
      days: daysBetween(period.startDate, period.endDate),
      users,
      preferences,
      canManage: this.isManagement(me),
      currentUserId: me.id,
    };
  }

  async updatePeriod(id: string, dto: UpdateHolidayPeriodDto) {
    const period = await this.getPeriodOrFail(id);
    const start = dto.startDate ?? period.startDate;
    const end = dto.endDate ?? period.endDate;
    if (start > end) throw new BadRequestException('Data de inceput e dupa data de sfarsit');
    if (daysBetween(start, end).length > 31) {
      throw new BadRequestException('Perioada poate avea cel mult 31 de zile');
    }
    period.startDate = start;
    period.endDate = end;
    if (dto.status) period.status = dto.status;
    await this.periodRepo.save(period);
    // Preferintele din afara noii perioade nu mai sunt relevante
    await this.prefRepo
      .createQueryBuilder()
      .delete()
      .where('period_id = :id AND (date < :start OR date > :end)', { id, start, end })
      .execute();
    return period;
  }

  // ============== PREFERINTE ==============

  /**
   * Salveaza preferintele unui dispecer. Dispecerul isi poate edita doar propriul rand
   * si doar cat perioada e deschisa; managerul/adminul pot edita oricand pe oricine.
   */
  async savePreferences(
    periodId: string,
    targetUserId: string,
    dto: SaveHolidayPreferencesDto,
    requester: { id: string; role: string },
  ) {
    const me = await this.assertCanView(requester);
    const period = await this.getPeriodOrFail(periodId);
    const manage = this.isManagement(me);

    if (!manage) {
      if (targetUserId !== me.id) {
        throw new ForbiddenException('Poti modifica doar propriile preferinte');
      }
      if (period.status === 'LOCKED') {
        throw new BadRequestException(
          'Perioada este inchisa. Cere managerului modificarea preferintelor.',
        );
      }
    }

    const dept = await this.getDispeceratDepartment();
    const target = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!target || !dept || target.departmentId !== dept.id) {
      throw new BadRequestException('Utilizatorul nu face parte din Dispecerat');
    }

    const validDays = new Set(daysBetween(period.startDate, period.endDate));
    for (const p of dto.preferences) {
      if (!validDays.has(p.date)) {
        throw new BadRequestException(`Data ${p.date} nu face parte din perioada ${period.name}`);
      }
    }

    for (const p of dto.preferences) {
      if (!p.choice) {
        await this.prefRepo.delete({ periodId, userId: targetUserId, date: p.date });
        continue;
      }
      await this.prefRepo
        .createQueryBuilder()
        .insert()
        .into(HolidayPreference)
        .values({
          periodId,
          userId: targetUserId,
          date: p.date,
          choice: p.choice,
          note: p.note?.trim() || null,
          updatedBy: me.id,
        })
        .orUpdate(['choice', 'note', 'updated_by', 'updated_at'], ['period_id', 'user_id', 'date'])
        .execute();
    }

    return this.getPeriodDetails(periodId, requester);
  }

  // ============== CHAT ==============

  /** Toate mesajele perioadei, in ordine cronologica (raman salvate permanent). */
  async listMessages(periodId: string, requester: { id: string; role: string }) {
    await this.assertCanView(requester);
    await this.getPeriodOrFail(periodId);
    // Cine deschide discutia a "citit" notificarile de chat pentru aceasta perioada
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: () => 'CURRENT_TIMESTAMP' } as any)
      .where('user_id = :userId AND type = :type AND is_read = false', {
        userId: requester.id,
        type: NotificationType.HOLIDAY_CHAT_MESSAGE,
      })
      .andWhere("data->>'periodId' = :periodId", { periodId })
      .execute()
      .catch((err) => this.logger.warn(`Mark chat notifications read failed: ${err?.message}`));
    const messages = await this.messageRepo.find({
      where: { periodId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      take: 1000,
    });
    return messages.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.user?.fullName || 'Utilizator',
      userRole: m.user?.role,
      message: m.message,
      createdAt: m.createdAt,
    }));
  }

  /** Oricine are acces la modul poate scrie, si dupa ce perioada a fost inchisa. */
  async postMessage(periodId: string, text: string, requester: { id: string; role: string }) {
    const me = await this.assertCanView(requester);
    await this.getPeriodOrFail(periodId);
    const clean = (text || '').trim();
    if (!clean) throw new BadRequestException('Mesajul este gol');
    await this.messageRepo.save(
      this.messageRepo.create({ periodId, userId: me.id, message: clean }),
    );
    const period = await this.getPeriodOrFail(periodId);
    this.notifyChatMessage(period, me, clean).catch((err) =>
      this.logger.warn(`Holiday chat notification failed: ${err?.message}`),
    );
    return this.listMessages(periodId, requester);
  }

  /**
   * Notifica (in-app + push, fara email) dispecerii si managerii Dispeceratului despre
   * un mesaj nou. Anti-spam: fiecare primeste cel mult O notificare necitita pe perioada;
   * urmatoarea vine abia dupa ce a deschis discutia (care marcheaza notificarea citita).
   */
  private async notifyChatMessage(period: HolidayPeriod, author: User, text: string) {
    const dept = await this.getDispeceratDepartment();
    if (!dept) return;
    const recipients = await this.userRepo.find({
      where: [
        { departmentId: dept.id, isActive: true, role: UserRole.USER },
        { departmentId: dept.id, isActive: true, role: UserRole.MANAGER },
        ...(dept.managerId ? [{ id: dept.managerId, isActive: true }] : []),
      ],
      select: ['id'],
    });
    const ids = [...new Set(recipients.map((r) => r.id))].filter((id) => id !== author.id);
    if (ids.length === 0) return;

    const alreadyUnread = await this.notificationRepo
      .createQueryBuilder('n')
      .select('n.userId', 'userId')
      .where('n.userId IN (:...ids)', { ids })
      .andWhere('n.type = :type', { type: NotificationType.HOLIDAY_CHAT_MESSAGE })
      .andWhere('n.isRead = false')
      .andWhere("n.data->>'periodId' = :periodId", { periodId: period.id })
      .getRawMany();
    const skip = new Set(alreadyUnread.map((r) => r.userId));
    const targets = ids.filter((id) => !skip.has(id));
    if (targets.length === 0) return;

    const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
    await this.notificationsService.createMany(
      targets.map((userId) => ({
        userId,
        type: NotificationType.HOLIDAY_CHAT_MESSAGE,
        title: `Mesaj nou - ${period.name}`,
        message: `${author.fullName}: ${preview}`,
        data: { periodId: period.id, url: '/sarbatori' },
        skipEmail: true,
      })),
    );
  }

  /** Autorul isi poate sterge mesajul; managerul/adminul pot sterge orice mesaj. */
  async deleteMessage(
    periodId: string,
    messageId: string,
    requester: { id: string; role: string },
  ) {
    const me = await this.assertCanView(requester);
    const msg = await this.messageRepo.findOne({ where: { id: messageId, periodId } });
    if (!msg) throw new NotFoundException('Mesajul nu a fost gasit');
    if (msg.userId !== me.id && !this.isManagement(me)) {
      throw new ForbiddenException('Poti sterge doar mesajele tale');
    }
    await this.messageRepo.remove(msg);
    return this.listMessages(periodId, requester);
  }

  // ============== PRECOMPLETARE PROGRAM ==============

  /**
   * Pune preferintele in program: Zi -> 07-19, Noapte -> 19-07, Concediu -> Concediu 12H.
   * "Orice" si zilele fara preferinta raman neschimbate. Restul lunii fiecarui dispecer
   * se pastreaza exact cum era. Adminul salveaza programul direct aprobat; managerul
   * il trimite spre aprobare (ca la editarea normala).
   */
  async applyToSchedule(periodId: string, requester: { id: string; role: string }) {
    const me = await this.assertCanView(requester);
    if (!this.isManagement(me)) throw new ForbiddenException();
    const period = await this.getPeriodOrFail(periodId);
    const isAdmin = me.role === UserRole.ADMIN || me.role === UserRole.MASTER_ADMIN;
    const status = isAdmin ? 'APPROVED' : 'PENDING_APPROVAL';

    const prefs = (await this.prefRepo.find({ where: { periodId } })).filter(
      (p) => p.choice !== 'ANY',
    );
    if (prefs.length === 0) {
      throw new BadRequestException(
        'Nu exista preferinte de pus in program (doar "Orice" sau nimic)',
      );
    }

    const shiftTypes = await this.shiftTypeRepo.find();
    const hhmm = (t: string) => String(t).slice(0, 5);
    const findShift = (start: string, end: string) =>
      shiftTypes.find(
        (s) =>
          hhmm(s.startTime) === start &&
          hhmm(s.endTime) === end &&
          !s.name.toLowerCase().includes('concediu'),
      );
    const dayShift = findShift('07:00', '19:00');
    const nightShift = findShift('19:00', '07:00');
    const leaveShift =
      shiftTypes.find(
        (s) => s.name.toLowerCase().includes('concediu') && s.shiftPattern === 'SHIFT_12H',
      ) || shiftTypes.find((s) => s.name.toLowerCase().includes('concediu'));
    if (!dayShift || !nightShift || !leaveShift) {
      throw new BadRequestException('Lipsesc tipurile de tura Zi 07-19 / Noapte 19-07 / Concediu');
    }
    const mapChoice: Record<
      Exclude<HolidayChoice, 'ANY'>,
      { shiftTypeId: string; notes: string }
    > = {
      DAY: { shiftTypeId: dayShift.id, notes: '07:00-19:00' },
      NIGHT: { shiftTypeId: nightShift.id, notes: '19:00-07:00' },
      LEAVE: { shiftTypeId: leaveShift.id, notes: 'Concediu' },
    };

    // Grupare: user -> luna (YYYY-MM) -> zi -> alegere
    const byUserMonth = new Map<string, Map<string, Map<string, HolidayChoice>>>();
    for (const p of prefs) {
      const month = p.date.slice(0, 7);
      if (!byUserMonth.has(p.userId)) byUserMonth.set(p.userId, new Map());
      const m = byUserMonth.get(p.userId)!;
      if (!m.has(month)) m.set(month, new Map());
      m.get(month)!.set(p.date, p.choice);
    }

    const results: Array<{
      userId: string;
      month: string;
      days: number;
      ok: boolean;
      error?: string;
    }> = [];
    for (const [userId, months] of byUserMonth) {
      for (const [monthYear, dayChoices] of months) {
        try {
          const [y, m] = monthYear.split('-').map(Number);
          const monthStart = `${monthYear}-01`;
          const monthEnd = iso(new Date(Date.UTC(y, m, 0)));
          // Luna completa existenta a userului (din orice program)
          const existing = await this.assignmentRepo.find({
            where: { userId, shiftDate: Between(monthStart, monthEnd) as any },
          });
          const byDate = new Map<
            string,
            { shiftTypeId: string; notes: string; workPositionId?: string }
          >();
          for (const a of existing) {
            const d =
              typeof a.shiftDate === 'string'
                ? String(a.shiftDate).slice(0, 10)
                : iso(new Date(a.shiftDate));
            // Concediile deja aprobate (randuri fara tura sau marcate "Concediu") raman
            // concediu - exact cum le retrimite si editorul de program.
            const isLeave = !a.shiftTypeId || a.isRestDay || (a.notes || '').includes('Concediu');
            byDate.set(
              d,
              isLeave
                ? { ...mapChoice.LEAVE, workPositionId: a.workPositionId || undefined }
                : {
                    shiftTypeId: a.shiftTypeId,
                    notes: a.notes || '',
                    workPositionId: a.workPositionId || undefined,
                  },
            );
          }
          for (const [date, choice] of dayChoices) {
            if (choice === 'ANY') continue;
            const prev = byDate.get(date);
            byDate.set(date, {
              ...mapChoice[choice],
              workPositionId: prev?.workPositionId || DEFAULT_WORK_POSITION_ID,
            });
          }
          const assignments = [...byDate.entries()].map(([shiftDate, a]) => ({
            userId,
            shiftDate,
            shiftTypeId: a.shiftTypeId,
            notes: a.notes,
            workPositionId: a.workPositionId || DEFAULT_WORK_POSITION_ID,
          }));

          const scheduleWithUser = await this.scheduleRepo
            .createQueryBuilder('ws')
            .innerJoin('ws.assignments', 'sa', 'sa.userId = :userId', { userId })
            .where('ws.month = :m AND ws.year = :y', { m, y })
            .getOne();

          if (scheduleWithUser) {
            await this.schedulesService.update(
              scheduleWithUser.id,
              { assignments, status: status as any },
              me.id,
            );
          } else {
            await this.schedulesService.create(me.id, {
              monthYear,
              assignments,
              status: status as any,
              notes: `Precompletat din preferintele de sarbatori (${period.name})`,
            } as any);
          }
          results.push({ userId, month: monthYear, days: dayChoices.size, ok: true });
        } catch (err: any) {
          this.logger.error(`Precompletare esuata user ${userId} ${monthYear}: ${err?.message}`);
          results.push({
            userId,
            month: monthYear,
            days: dayChoices.size,
            ok: false,
            error: err?.message,
          });
        }
      }
    }

    return { status, results };
  }

  // ============== CERERI DE CONCEDIU ==============

  /**
   * Creeaza cereri de concediu de odihna (IN ASTEPTARE) din zilele marcate "Concediu",
   * grupate pe intervale consecutive. Ele trec apoi prin aprobarea normala (sold etc.).
   * Intervalele care se suprapun cu o cerere existenta sunt sarite.
   */
  async createLeaveRequests(periodId: string, requester: { id: string; role: string }) {
    const me = await this.assertCanView(requester);
    if (!this.isManagement(me)) throw new ForbiddenException();
    const period = await this.getPeriodOrFail(periodId);
    const prefs = await this.prefRepo.find({
      where: { periodId, choice: 'LEAVE' },
      order: { date: 'ASC' },
    });
    if (prefs.length === 0) throw new BadRequestException('Nimeni nu a marcat zile de concediu');

    const byUser = new Map<string, string[]>();
    for (const p of prefs) {
      if (!byUser.has(p.userId)) byUser.set(p.userId, []);
      byUser.get(p.userId)!.push(p.date);
    }

    const users = await this.userRepo.find({
      where: { id: In([...byUser.keys()]) },
      select: ['id', 'fullName'],
    });
    const nameOf = new Map(users.map((u) => [u.id, u.fullName]));
    const results: Array<{
      userName: string;
      startDate: string;
      endDate: string;
      ok: boolean;
      error?: string;
    }> = [];

    for (const [userId, dates] of byUser) {
      // Intervale consecutive
      const ranges: Array<[string, string]> = [];
      for (const d of dates.sort()) {
        const last = ranges[ranges.length - 1];
        if (last && iso(addDays(new Date(`${last[1]}T00:00:00Z`), 1)) === d) last[1] = d;
        else ranges.push([d, d]);
      }
      for (const [startDate, endDate] of ranges) {
        try {
          await this.leaveRequestsService.create(userId, {
            leaveType: 'VACATION',
            startDate,
            endDate,
            reason: `Preferinte sarbatori: ${period.name}`,
          } as any);
          results.push({ userName: nameOf.get(userId) || userId, startDate, endDate, ok: true });
        } catch (err: any) {
          results.push({
            userName: nameOf.get(userId) || userId,
            startDate,
            endDate,
            ok: false,
            error: err?.message,
          });
        }
      }
    }
    return { results };
  }
}
