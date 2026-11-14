import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ScheduleTimeRequest } from './entities/schedule-time-request.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { OfficeSchedulePrefillService } from './office-schedule-prefill.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { managerDeptScope, inManagerScope } from '../../common/utils/manager-scope';
import { AUTO_SCHEDULE_STARTS, endOf8h } from './auto-schedule.constants';
import {
  CreateScheduleTimeRequestDto,
  RespondScheduleTimeRequestDto,
} from './dto/schedule-time-request.dto';

const MAX_DAYS = 62;

@Injectable()
export class ScheduleTimeRequestsService {
  private readonly logger = new Logger(ScheduleTimeRequestsService.name);

  constructor(
    @InjectRepository(ScheduleTimeRequest)
    private readonly repo: Repository<ScheduleTimeRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly prefill: OfficeSchedulePrefillService,
    private readonly notifications: NotificationsService,
  ) {}

  private async loadUser(id: string): Promise<User> {
    const u = await this.userRepo.findOne({ where: { id }, relations: ['department'] });
    if (!u) throw new NotFoundException('Utilizator negasit');
    return u;
  }

  private isManagement(u: User) {
    return [UserRole.ADMIN, UserRole.MASTER_ADMIN, UserRole.MANAGER].includes(u.role);
  }

  private interval(start: string) {
    return `${start}-${endOf8h(start)}`;
  }

  private fmt(d: string) {
    const [y, m, day] = String(d).slice(0, 10).split('-');
    return `${day}.${m}.${y}`;
  }

  private periodLabel(r: { startDate: string; endDate: string }) {
    const s = String(r.startDate).slice(0, 10);
    const e = String(r.endDate).slice(0, 10);
    return s === e ? this.fmt(s) : `${this.fmt(s)} - ${this.fmt(e)}`;
  }

  async eligibility(userId: string) {
    const me = await this.loadUser(userId);
    const eligible = this.prefill.isAutoScheduleUser(me);
    const defaultStart = eligible ? this.prefill.defaultStartFor(me) : null;
    return {
      eligible,
      defaultStart,
      defaultInterval: defaultStart ? this.interval(defaultStart) : null,
      options: AUTO_SCHEDULE_STARTS.map((s) => ({ start: s, label: this.interval(s) })),
    };
  }

  async create(userId: string, dto: CreateScheduleTimeRequestDto) {
    const me = await this.loadUser(userId);
    if (!this.prefill.isAutoScheduleUser(me)) {
      throw new ForbiddenException('Doar angajatii cu program fix automat pot cere alta ora');
    }
    const start = dto.startDate.slice(0, 10);
    const end = dto.endDate.slice(0, 10);
    const today = this.prefill.todayStr();
    if (end < start) throw new BadRequestException('Data de final este inainte de data de inceput');
    if (start < today) throw new BadRequestException('Nu poti cere pentru zile trecute');
    const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
    if (days > MAX_DAYS) throw new BadRequestException(`Maxim ${MAX_DAYS} de zile pe o cerere`);

    const overlapping = await this.repo
      .createQueryBuilder('r')
      .where('r.userId = :u', { u: me.id })
      .andWhere('r.status = :s', { s: 'PENDING' })
      .andWhere('r.startDate <= :end AND r.endDate >= :start', { start, end })
      .getCount();
    if (overlapping > 0) {
      throw new BadRequestException('Ai deja o cerere in asteptare pentru aceste zile');
    }

    const saved = await this.repo.save(
      this.repo.create({
        userId: me.id,
        startDate: start,
        endDate: end,
        startTime: dto.startTime,
        reason: dto.reason?.trim() || null,
        status: 'PENDING',
      }),
    );

    // Anunta adminii si managerii care controleaza departamentul omului
    const recipients = await this.userRepo.find({
      where: {
        role: In([UserRole.ADMIN, UserRole.MASTER_ADMIN, UserRole.MANAGER]),
        isActive: true,
      },
    });
    const ids = recipients
      .filter(
        (r) => r.role !== UserRole.MANAGER || inManagerScope(managerDeptScope(r), me.departmentId),
      )
      .filter((r) => r.id !== me.id)
      .map((r) => r.id);
    if (ids.length) {
      await this.notifications.createMany(
        ids.map((id) => ({
          userId: id,
          type: NotificationType.SCHEDULE_TIME_REQUEST,
          title: 'Cerere de program la alta ora',
          message: `${me.fullName} cere program ${this.interval(dto.startTime)} pe ${this.periodLabel(saved)}${
            saved.reason ? ` (${saved.reason})` : ''
          }.`,
          data: { scheduleTimeRequestId: saved.id, url: '/ora-program' },
        })),
      );
    }
    return saved;
  }

  async my(userId: string) {
    return this.repo.find({
      where: { userId },
      relations: ['reviewer'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async list(viewerId: string, status?: string) {
    const viewer = await this.loadUser(viewerId);
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('r.reviewer', 'reviewer')
      .orderBy('r.createdAt', 'DESC')
      .take(300);
    if (status) qb.andWhere('r.status = :status', { status });
    const scope = managerDeptScope(viewer);
    if (scope) qb.andWhere('user.departmentId IN (:...scope)', { scope });
    const rows = await qb.getMany();
    return rows.map((r) => ({
      ...r,
      user: r.user
        ? { id: r.user.id, fullName: r.user.fullName, department: r.user.department }
        : null,
      reviewer: r.reviewer ? { id: r.reviewer.id, fullName: r.reviewer.fullName } : null,
    }));
  }

  async respond(id: string, reviewerId: string, dto: RespondScheduleTimeRequestDto) {
    const reviewer = await this.loadUser(reviewerId);
    if (!this.isManagement(reviewer)) throw new ForbiddenException();
    const req = await this.repo.findOne({ where: { id }, relations: ['user'] });
    if (!req) throw new NotFoundException('Cererea nu exista');
    if (req.status !== 'PENDING') throw new BadRequestException('Cererea a fost deja procesata');
    if (!inManagerScope(managerDeptScope(reviewer), req.user?.departmentId)) {
      throw new ForbiddenException('Nu ai acces la acest departament');
    }

    req.status = dto.status;
    req.reviewedBy = reviewer.id;
    req.reviewedAt = new Date();
    req.reviewNote = dto.note?.trim() || null;
    await this.repo.save(req);

    let applied: { updated: number; created: number; skipped: number } | null = null;
    if (dto.status === 'APPROVED') {
      applied = await this.prefill.applyTimeRequest(req);
      this.logger.log(
        `[Ora program] Cerere ${req.id} aprobata: ${applied.updated} modificate, ${applied.created} create, ${applied.skipped} sarite`,
      );
    }

    const approved = dto.status === 'APPROVED';
    await this.notifications.create({
      userId: req.userId,
      type: approved
        ? NotificationType.SCHEDULE_TIME_REQUEST_APPROVED
        : NotificationType.SCHEDULE_TIME_REQUEST_REJECTED,
      title: approved ? 'Cererea de program a fost aprobata' : 'Cererea de program a fost respinsa',
      message: `${approved ? 'Vii' : 'Cererea pentru'} ${this.interval(req.startTime)} pe ${this.periodLabel(
        req,
      )}${approved ? '.' : ' a fost respinsa.'}${req.reviewNote ? ` Mentiune: ${req.reviewNote}` : ''}`,
      data: { scheduleTimeRequestId: req.id, url: '/ora-program' },
    });
    return { ...req, applied };
  }

  async cancel(id: string, userId: string) {
    const req = await this.repo.findOne({ where: { id } });
    if (!req || req.userId !== userId) throw new NotFoundException('Cererea nu exista');
    if (req.status !== 'PENDING') {
      throw new BadRequestException('Poti anula doar cererile in asteptare');
    }
    req.status = 'CANCELLED';
    await this.repo.save(req);
    return req;
  }
}
