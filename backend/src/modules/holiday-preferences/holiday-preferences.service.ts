import { managerDeptScope } from '../../common/utils/manager-scope';
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
import { WorkPosition } from '../schedules/entities/work-position.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { LeaveRequestsService } from '../leave-requests/leave-requests.service';
import { orthodoxEaster } from '../control-notes/utils/romanian-holidays';
import {
  ACHIZITII_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
  DISPECERAT_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
  HANDICAP_PARKING_DEPARTMENT_NAME,
  MAINTENANCE_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
  PROCESE_VERBALE_DEPARTMENT_NAME,
} from '../parking/constants/parking.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';

const MANAGEMENT_ROLES: string[] = [UserRole.MANAGER, UserRole.ADMIN, UserRole.MASTER_ADMIN];
const DEFAULT_WORK_POSITION_ID = '00000000-0000-0000-0000-000000000001'; // Dispecerat

/**
 * Grupuri de sarbatori: fiecare departament e un grup separat (colegii se vad si discuta
 * doar intre ei), cu exceptia Parcari Handicap + Parcari Domiciliu, care sunt impreuna.
 */
const HANDICAP_DOMICILIU_GROUP = 'HANDICAP_DOMICILIU';
const MERGED_GROUP_DEPTS = [HANDICAP_PARKING_DEPARTMENT_NAME, DOMICILIU_PARKING_DEPARTMENT_NAME];
/** Departamente de birou (program de zi): nu au optiunea "Noapte". */
const OFFICE_DEPTS = [
  HANDICAP_PARKING_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
  PROCESE_VERBALE_DEPARTMENT_NAME,
  ACHIZITII_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
];
const GROUP_ORDER = [
  DISPECERAT_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
  MAINTENANCE_DEPARTMENT_NAME,
];

export interface HolidayGroup {
  key: string;
  name: string;
  departmentIds: string[];
  choices: HolidayChoice[];
  office: boolean;
}

type Requester = { id: string; role: string };

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
    @InjectRepository(WorkPosition)
    private readonly workPositionRepo: Repository<WorkPosition>,
  ) {}

  /** Pozitia implicita dupa departament - aceeasi regula ca editorul de program. */
  private defaultPositionFor(deptName: string | undefined, positions: WorkPosition[]): string {
    const dep = (deptName || '').toLowerCase();
    const find = (pred: (p: WorkPosition) => boolean) => positions.find(pred)?.id;
    const sn = (p: WorkPosition) => (p.shortName || '').toLowerCase();
    const nm = (p: WorkPosition) => (p.name || '').toLowerCase();
    let id: string | undefined;
    if (dep.includes('intretinere')) id = find((p) => nm(p).includes('intretinere'));
    else if (
      ['parcari handicap', 'parcari domiciliu', 'achizitii', 'parcometre', 'procese verbale'].some(
        (d) => dep.includes(d),
      )
    )
      id = find((p) => nm(p).includes('birouri') || sn(p) === 'b');
    else if (dep.includes('control'))
      id = find((p) => nm(p).includes('control') || sn(p) === 'ctrl' || sn(p) === 'c');
    else id = find((p) => nm(p).includes('dispecerat') || sn(p) === 'disp' || sn(p) === 'd');
    return id || DEFAULT_WORK_POSITION_ID;
  }

  // ============== ACCES ==============

  private isManagement(user: { role: string }) {
    return MANAGEMENT_ROLES.includes(user.role);
  }

  /** Toate grupurile care au cel putin un angajat activ (rol USER). */
  async getGroups(): Promise<HolidayGroup[]> {
    const depts = await this.departmentRepo
      .createQueryBuilder('d')
      .innerJoin(User, 'u', 'u.departmentId = d.id AND u.isActive = true AND u.role = :role', {
        role: UserRole.USER,
      })
      .select(['d.id', 'd.name'])
      .groupBy('d.id')
      .addGroupBy('d.name')
      .getMany();

    const groups = new Map<string, HolidayGroup>();
    for (const d of depts) {
      const merged = MERGED_GROUP_DEPTS.includes(d.name);
      const key = merged ? HANDICAP_DOMICILIU_GROUP : d.id;
      const g = groups.get(key) || {
        key,
        name: merged ? 'Parcari Handicap + Domiciliu' : d.name,
        departmentIds: [],
        choices: [] as HolidayChoice[],
        office: true,
      };
      g.departmentIds.push(d.id);
      g.office = g.office && OFFICE_DEPTS.includes(d.name);
      groups.set(key, g);
    }
    const order = (g: HolidayGroup) => {
      const idx = GROUP_ORDER.indexOf(g.name);
      return idx === -1 ? 99 : idx;
    };
    return [...groups.values()]
      .map((g) => ({
        ...g,
        choices: (g.office
          ? ['LEAVE', 'DAY', 'ANY']
          : ['LEAVE', 'DAY', 'NIGHT', 'ANY']) as HolidayChoice[],
      }))
      .sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));
  }

  private groupKeyForDepartment(dept?: { id: string; name: string } | null): string | null {
    if (!dept) return null;
    return MERGED_GROUP_DEPTS.includes(dept.name) ? HANDICAP_DOMICILIU_GROUP : dept.id;
  }

  private async loadUser(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['department'] });
    if (!user) throw new ForbiddenException();
    return user;
  }

  /**
   * Stabileste grupul in care lucreaza cererea. Angajatii sunt mereu in grupul
   * departamentului lor; managerul/adminul pot alege orice grup (implicit: al lor sau primul).
   */
  private async resolveGroup(
    requester: Requester,
    requestedKey?: string,
  ): Promise<{ me: User; group: HolidayGroup; groups: HolidayGroup[] }> {
    const me = await this.loadUser(requester.id);
    const groups = await this.getGroups();
    if (this.isManagement(me)) {
      // Managerul cu departamente alocate vede doar grupurile departamentelor lui
      const scope = managerDeptScope(me);
      const visible = scope
        ? groups.filter((g) => g.departmentIds.some((d) => scope.includes(d)))
        : groups;
      if (scope && visible.length === 0) {
        throw new ForbiddenException('Nu ai departamente cu angajati alocate');
      }
      return this.pickManagementGroup(me, visible, requestedKey);
    }
    const key = this.groupKeyForDepartment(me.department);
    const group = groups.find((g) => g.key === key);
    if (!group) {
      throw new ForbiddenException('Modulul de sarbatori necesita un departament');
    }
    return { me, group, groups: [group] };
  }

  private pickManagementGroup(me: User, groups: HolidayGroup[], requestedKey?: string) {
    const own = this.groupKeyForDepartment(me.department);
    const group =
      groups.find((g) => g.key === requestedKey) || groups.find((g) => g.key === own) || groups[0];
    if (!group) throw new NotFoundException('Nu exista departamente cu angajati');
    return { me, group, groups };
  }

  private async groupUsers(group: HolidayGroup) {
    return this.userRepo.find({
      where: { departmentId: In(group.departmentIds), isActive: true, role: UserRole.USER },
      select: ['id', 'fullName', 'role', 'departmentId'],
      order: { fullName: 'ASC' },
    });
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

  async listPeriods(requester: Requester, groupKey?: string) {
    const { group, groups } = await this.resolveGroup(requester, groupKey);
    await this.ensurePeriods();
    // Perioadele care nu s-au terminat de mai mult de 30 de zile
    const cutoff = iso(addDays(new Date(), -30));
    const periods = await this.periodRepo
      .createQueryBuilder('p')
      .where('p.endDate >= :cutoff', { cutoff })
      .orderBy('p.startDate', 'ASC')
      .getMany();
    return {
      periods: periods.map((p) => ({ ...p, locked: (p.lockedGroups || []).includes(group.key) })),
      groups: groups.map((g) => ({ key: g.key, name: g.name })),
      groupKey: group.key,
    };
  }

  private async getPeriodOrFail(id: string): Promise<HolidayPeriod> {
    const period = await this.periodRepo.findOne({ where: { id } });
    if (!period) throw new NotFoundException('Perioada nu a fost gasita');
    return period;
  }

  async getPeriodDetails(id: string, requester: Requester, groupKey?: string) {
    const { me, group, groups } = await this.resolveGroup(requester, groupKey);
    const period = await this.getPeriodOrFail(id);
    const users = await this.groupUsers(group);
    const preferences = users.length
      ? await this.prefRepo.find({
          where: { periodId: id, userId: In(users.map((u) => u.id)) },
          select: ['id', 'userId', 'date', 'choice', 'note', 'updatedAt'],
        })
      : [];
    return {
      period,
      days: daysBetween(period.startDate, period.endDate),
      users: users.map((u) => ({ id: u.id, fullName: u.fullName, role: u.role })),
      preferences,
      canManage: this.isManagement(me),
      currentUserId: me.id,
      group: { key: group.key, name: group.name, choices: group.choices, office: group.office },
      groups: groups.map((g) => ({ key: g.key, name: g.name })),
      locked: (period.lockedGroups || []).includes(group.key),
    };
  }

  /** Inchide / redeschide perioada pentru un singur grup (departament). */
  async setGroupLock(id: string, groupKey: string, locked: boolean, requester: Requester) {
    const { group } = await this.resolveGroup(requester, groupKey);
    if (group.key !== groupKey) throw new BadRequestException('Grup necunoscut');
    const period = await this.getPeriodOrFail(id);
    const set = new Set(period.lockedGroups || []);
    if (locked) set.add(groupKey);
    else set.delete(groupKey);
    period.lockedGroups = [...set];
    await this.periodRepo.save(period);
    return this.getPeriodDetails(id, requester, groupKey);
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
    requester: Requester,
  ) {
    const me = await this.loadUser(requester.id);
    const period = await this.getPeriodOrFail(periodId);
    const manage = this.isManagement(me);
    const target = await this.loadUser(targetUserId).catch(() => null);
    const targetKey = this.groupKeyForDepartment(target?.department);
    const group = (await this.getGroups()).find((g) => g.key === targetKey);
    if (!target || !group || target.role !== UserRole.USER) {
      throw new BadRequestException('Utilizatorul nu face parte dintr-un departament cu sarbatori');
    }
    const scope = managerDeptScope(me);
    if (scope && !group.departmentIds.some((d) => scope.includes(d))) {
      throw new ForbiddenException('Nu ai acces la acest departament');
    }

    if (!manage) {
      if (targetUserId !== me.id) {
        throw new ForbiddenException('Poti modifica doar propriile preferinte');
      }
      if ((period.lockedGroups || []).includes(group.key)) {
        throw new BadRequestException(
          'Perioada este inchisa. Cere managerului modificarea preferintelor.',
        );
      }
    }

    const validDays = new Set(daysBetween(period.startDate, period.endDate));
    for (const p of dto.preferences) {
      if (!validDays.has(p.date)) {
        throw new BadRequestException(`Data ${p.date} nu face parte din perioada ${period.name}`);
      }
      if (p.choice && !group.choices.includes(p.choice)) {
        throw new BadRequestException(`Optiunea aleasa nu este disponibila pentru ${group.name}`);
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

    return this.getPeriodDetails(periodId, requester, group.key);
  }

  // ============== CHAT ==============

  /** Mesajele grupului pentru perioada, in ordine cronologica (raman salvate permanent). */
  async listMessages(periodId: string, requester: Requester, groupKey?: string) {
    const { group } = await this.resolveGroup(requester, groupKey);
    await this.getPeriodOrFail(periodId);
    // Cine deschide discutia a "citit" notificarile de chat pentru aceasta perioada + grup
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: () => 'CURRENT_TIMESTAMP' } as any)
      .where('user_id = :userId AND type = :type AND is_read = false', {
        userId: requester.id,
        type: NotificationType.HOLIDAY_CHAT_MESSAGE,
      })
      .andWhere("data->>'periodId' = :periodId", { periodId })
      .andWhere("(data->>'groupKey' = :groupKey OR data->>'groupKey' IS NULL)", {
        groupKey: group.key,
      })
      .execute()
      .catch((err) => this.logger.warn(`Mark chat notifications read failed: ${err?.message}`));
    const messages = await this.messageRepo.find({
      where: { periodId, groupKey: group.key },
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

  /** Oricine din grup (plus manager/admin) poate scrie, si dupa ce perioada a fost inchisa. */
  async postMessage(periodId: string, text: string, requester: Requester, groupKey?: string) {
    const { me, group } = await this.resolveGroup(requester, groupKey);
    const period = await this.getPeriodOrFail(periodId);
    const clean = (text || '').trim();
    if (!clean) throw new BadRequestException('Mesajul este gol');
    await this.messageRepo.save(
      this.messageRepo.create({ periodId, groupKey: group.key, userId: me.id, message: clean }),
    );
    this.notifyChatMessage(period, group, me, clean).catch((err) =>
      this.logger.warn(`Holiday chat notification failed: ${err?.message}`),
    );
    return this.listMessages(periodId, requester, group.key);
  }

  /**
   * Notifica (in-app + push, fara email) angajatii grupului si managerii departamentelor
   * lui. Anti-spam: fiecare primeste cel mult O notificare necitita pe perioada si grup;
   * urmatoarea vine abia dupa ce a deschis discutia (care marcheaza notificarea citita).
   */
  private async notifyChatMessage(
    period: HolidayPeriod,
    group: HolidayGroup,
    author: User,
    text: string,
  ) {
    const depts = await this.departmentRepo.find({ where: { id: In(group.departmentIds) } });
    const managerIds = depts.map((d) => d.managerId).filter(Boolean);
    // + managerii care au alocat explicit unul dintre departamentele grupului
    const scopedManagers = (
      await this.userRepo.find({ where: { role: UserRole.MANAGER, isActive: true } })
    ).filter((m) => (managerDeptScope(m) || []).some((d) => group.departmentIds.includes(d)));
    for (const m of scopedManagers) managerIds.push(m.id);
    const recipients = await this.userRepo.find({
      where: [
        { departmentId: In(group.departmentIds), isActive: true, role: UserRole.USER },
        { departmentId: In(group.departmentIds), isActive: true, role: UserRole.MANAGER },
        ...(managerIds.length ? [{ id: In(managerIds), isActive: true }] : []),
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
      .andWhere("n.data->>'groupKey' = :groupKey", { groupKey: group.key })
      .getRawMany();
    const skip = new Set(alreadyUnread.map((r) => r.userId));
    const targets = ids.filter((id) => !skip.has(id));
    if (targets.length === 0) return;

    const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
    await this.notificationsService.createMany(
      targets.map((userId) => ({
        userId,
        type: NotificationType.HOLIDAY_CHAT_MESSAGE,
        title: `Mesaj nou - ${period.name} (${group.name})`,
        message: `${author.fullName}: ${preview}`,
        data: { periodId: period.id, groupKey: group.key, url: '/sarbatori' },
        skipEmail: true,
      })),
    );
  }

  /** Autorul isi poate sterge mesajul; managerul/adminul pot sterge orice mesaj. */
  async deleteMessage(periodId: string, messageId: string, requester: Requester) {
    const me = await this.loadUser(requester.id);
    const msg = await this.messageRepo.findOne({ where: { id: messageId, periodId } });
    if (!msg) throw new NotFoundException('Mesajul nu a fost gasit');
    if (msg.userId !== me.id && !this.isManagement(me)) {
      throw new ForbiddenException('Poti sterge doar mesajele tale');
    }
    await this.messageRepo.remove(msg);
    return this.listMessages(periodId, requester, msg.groupKey);
  }

  // ============== PRECOMPLETARE PROGRAM ==============

  /**
   * Pune preferintele grupului in program: Zi / Noapte -> turele obisnuite ale fiecarui om
   * (cele mai frecvente din program; implicit 07-19 / 19-07, la birou 07:30-15:30), Concediu -> CO.
   * "Orice" si zilele fara preferinta raman neschimbate. Restul lunii fiecarui dispecer
   * se pastreaza exact cum era. Adminul salveaza programul direct aprobat; managerul
   * il trimite spre aprobare (ca la editarea normala).
   */
  async applyToSchedule(periodId: string, requester: Requester, groupKey?: string) {
    const { me, group } = await this.resolveGroup(requester, groupKey);
    if (!this.isManagement(me)) throw new ForbiddenException();
    const groupUserIds = (await this.groupUsers(group)).map((u) => u.id);
    const period = await this.getPeriodOrFail(periodId);
    const isAdmin = me.role === UserRole.ADMIN || me.role === UserRole.MASTER_ADMIN;
    const status = isAdmin ? 'APPROVED' : 'PENDING_APPROVAL';

    const prefs = groupUserIds.length
      ? (await this.prefRepo.find({ where: { periodId, userId: In(groupUserIds) } })).filter(
          (p) => p.choice !== 'ANY',
        )
      : [];
    if (prefs.length === 0) {
      throw new BadRequestException(
        'Nu exista preferinte de pus in program (doar "Orice" sau nimic)',
      );
    }

    const shiftTypes = await this.shiftTypeRepo.find();
    const hhmm = (t: string) => String(t).slice(0, 5);
    const isLeaveType = (st?: ShiftType) => !!st?.name?.toLowerCase().includes('concediu');
    const findShift = (start: string, end: string) =>
      shiftTypes.find(
        (st) => hhmm(st.startTime) === start && hhmm(st.endTime) === end && !isLeaveType(st),
      );
    const leaveFor = (pattern?: string) =>
      shiftTypes.find((st) => isLeaveType(st) && st.shiftPattern === pattern) ||
      shiftTypes.find((st) => isLeaveType(st));
    const notesFor = (st: ShiftType) => `${hhmm(st.startTime)}-${hhmm(st.endTime)}`;

    // Turele implicite ale grupului, folosite doar daca omul nu are inca ture in program
    const fallbackDay = group.office
      ? findShift('07:30', '15:30') || findShift('07:00', '19:00')
      : findShift('07:00', '19:00');
    const fallbackNight = findShift('19:00', '07:00');
    if (!fallbackDay || !leaveFor('SHIFT_12H')) {
      throw new BadRequestException('Lipsesc tipurile de tura de zi / concediu');
    }

    /**
     * Turele obisnuite ale unui om: cea mai frecventa tura de zi si de noapte din luna
     * precompletata si din luna anterioara (ex: Control 06-14, birou 07:30-15:30).
     */
    const positions = await this.workPositionRepo.find();
    const groupUsersFull = await this.userRepo.find({
      where: {
        id: In(groupUserIds.length ? groupUserIds : ['00000000-0000-0000-0000-000000000000']),
      },
      relations: ['department'],
    });
    const deptNameOf = new Map(groupUsersFull.map((u) => [u.id, u.department?.name]));
    const usualShifts = async (userId: string, monthStart: string, monthEnd: string) => {
      const prevStart = iso(addDays(new Date(`${monthStart}T00:00:00Z`), -31));
      const rows = await this.assignmentRepo.find({
        where: { userId, shiftDate: Between(prevStart, monthEnd) as any },
        relations: ['shiftType'],
      });
      const count = (night: boolean) => {
        const c = new Map<string, { st: ShiftType; n: number }>();
        for (const r of rows) {
          const st = r.shiftType;
          if (!st || r.isRestDay || isLeaveType(st) || !!st.isNightShift !== night) continue;
          const e = c.get(st.id) || { st, n: 0 };
          e.n++;
          c.set(st.id, e);
        }
        return [...c.values()].sort((a, b) => b.n - a.n)[0]?.st;
      };
      const positions = new Map<string, number>();
      for (const r of rows) {
        if (r.workPositionId)
          positions.set(r.workPositionId, (positions.get(r.workPositionId) || 0) + 1);
      }
      const day = count(false) || fallbackDay;
      const night = count(true) || fallbackNight || day;
      return {
        day,
        night,
        leave: leaveFor(day.shiftPattern)!,
        workPositionId: [...positions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
      };
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
          const usual = await usualShifts(userId, monthStart, monthEnd);
          const mapChoice: Record<
            Exclude<HolidayChoice, 'ANY'>,
            { shiftTypeId: string; notes: string }
          > = {
            DAY: { shiftTypeId: usual.day.id, notes: notesFor(usual.day) },
            NIGHT: { shiftTypeId: usual.night.id, notes: notesFor(usual.night) },
            LEAVE: { shiftTypeId: usual.leave.id, notes: 'Concediu' },
          };
          const defaultPosition =
            usual.workPositionId || this.defaultPositionFor(deptNameOf.get(userId), positions);
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
              workPositionId: prev?.workPositionId || defaultPosition,
            });
          }
          const assignments = [...byDate.entries()].map(([shiftDate, a]) => ({
            userId,
            shiftDate,
            shiftTypeId: a.shiftTypeId,
            notes: a.notes,
            workPositionId: a.workPositionId || defaultPosition,
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
  async createLeaveRequests(periodId: string, requester: Requester, groupKey?: string) {
    const { me, group } = await this.resolveGroup(requester, groupKey);
    if (!this.isManagement(me)) throw new ForbiddenException();
    const period = await this.getPeriodOrFail(periodId);
    const groupUserIds = (await this.groupUsers(group)).map((u) => u.id);
    const prefs = groupUserIds.length
      ? await this.prefRepo.find({
          where: { periodId, choice: 'LEAVE', userId: In(groupUserIds) },
          order: { date: 'ASC' },
        })
      : [];
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
