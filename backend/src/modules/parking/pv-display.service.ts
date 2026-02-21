import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PvDisplaySession } from './entities/pv-display-session.entity';
import { PvDisplayDay } from './entities/pv-display-day.entity';
import { PvDisplaySessionComment } from './entities/pv-display-session-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CreatePvDisplaySessionDto } from './dto/create-pv-display-session.dto';
import { UpdatePvDisplaySessionDto } from './dto/update-pv-display-session.dto';
import { CompletePvDisplayDayDto } from './dto/complete-pv-display-day.dto';
import { AdminAssignPvDayDto } from './dto/admin-assign-pv-day.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import {
  PvSessionStatus,
  PvDayStatus,
  PV_SESSION_STATUS,
  PV_DAY_STATUS,
  PROCESE_VERBALE_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
} from './constants/parking.constants';
import { removeDiacritics } from '../../common/utils/remove-diacritics';

@Injectable()
export class PvDisplayService {
  private readonly logger = new Logger(PvDisplayService.name);

  constructor(
    @InjectRepository(PvDisplaySession)
    private readonly sessionRepository: Repository<PvDisplaySession>,
    @InjectRepository(PvDisplayDay)
    private readonly dayRepository: Repository<PvDisplayDay>,
    @InjectRepository(PvDisplaySessionComment)
    private readonly commentRepository: Repository<PvDisplaySessionComment>,
    @InjectRepository(ParkingHistory)
    private readonly historyRepository: Repository<ParkingHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ===== SESSIONS =====

  async createSession(userId: string, dto: CreatePvDisplaySessionDto, user: any): Promise<PvDisplaySession> {
    // Doar PVF si Admin pot crea sesiuni
    const userDeptName = removeDiacritics(user.department?.name || '');
    const canCreate = user.role === UserRole.ADMIN || userDeptName === PROCESE_VERBALE_DEPARTMENT_NAME;

    if (!canCreate) {
      throw new ForbiddenException('Doar departamentul Procese Verbale/Facturare si administratorii pot crea sesiuni');
    }

    // Validare: trebuie sa aiba cel putin 1 zi
    if (!dto.days || dto.days.length === 0) {
      throw new BadRequestException('Sesiunea trebuie sa aiba cel putin o zi de afisare');
    }

    // Validare: maxim 5 zile
    if (dto.days.length > 5) {
      throw new BadRequestException('Sesiunea poate avea maxim 5 zile de afisare');
    }

    // Creeaza sesiunea
    const session = this.sessionRepository.create({
      monthYear: dto.monthYear,
      description: dto.description ? removeDiacritics(dto.description) : null,
      status: PV_SESSION_STATUS.DRAFT as PvSessionStatus,
      createdBy: userId,
      lastModifiedBy: userId,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Creeaza zilele
    const days = dto.days.map((dayDto) =>
      this.dayRepository.create({
        sessionId: savedSession.id,
        displayDate: dayDto.displayDate,
        dayOrder: dayDto.dayOrder,
        noticeCount: dayDto.noticeCount,
        firstNoticeSeries: dayDto.firstNoticeSeries || null,
        firstNoticeNumber: dayDto.firstNoticeNumber || null,
        lastNoticeSeries: dayDto.lastNoticeSeries || null,
        lastNoticeNumber: dayDto.lastNoticeNumber || null,
        noticesDateFrom: dayDto.noticesDateFrom || null,
        noticesDateTo: dayDto.noticesDateTo || null,
        status: PV_DAY_STATUS.OPEN as PvDayStatus,
      }),
    );

    await this.dayRepository.save(days);

    // History
    await this.recordSessionHistory(savedSession.id, 'CREATED', userId, {
      monthYear: dto.monthYear,
      daysCount: dto.days.length,
    });

    // Notifica Control + Admin + Manager
    await this.notifySessionCreated(savedSession, userId);

    this.logger.log(`PV Display session created: ${savedSession.id} for ${dto.monthYear}`);

    return this.findOneSession(savedSession.id);
  }

  async findAllSessions(status?: PvSessionStatus): Promise<PvDisplaySession[]> {
    const query = this.sessionRepository.createQueryBuilder('session')
      .leftJoinAndSelect('session.creator', 'creator')
      .leftJoinAndSelect('session.lastModifier', 'lastModifier')
      .leftJoinAndSelect('session.days', 'days')
      .leftJoinAndSelect('days.controlUser1', 'controlUser1')
      .leftJoinAndSelect('days.controlUser2', 'controlUser2');

    if (status) {
      query.andWhere('session.status = :status', { status });
    }

    return query.orderBy('session.createdAt', 'DESC').addOrderBy('days.dayOrder', 'ASC').getMany();
  }

  async findOneSession(id: string): Promise<PvDisplaySession> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: [
        'creator',
        'lastModifier',
        'days',
        'days.controlUser1',
        'days.controlUser2',
        'days.completedByUser',
        'comments',
        'comments.user',
      ],
    });

    if (!session) {
      throw new NotFoundException(`Sesiunea cu ID ${id} nu a fost gasita`);
    }

    // Sorteaza zilele dupa dayOrder
    if (session.days) {
      session.days.sort((a, b) => a.dayOrder - b.dayOrder);
    }

    return session;
  }

  async updateSession(id: string, userId: string, dto: UpdatePvDisplaySessionDto, user: any): Promise<PvDisplaySession> {
    // Doar Admin poate edita sesiuni
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot modifica sesiunile');
    }

    const session = await this.findOneSession(id);
    const changes: Record<string, any> = {};

    if (dto.description !== undefined && dto.description !== session.description) {
      changes.description = { from: session.description, to: dto.description };
      session.description = dto.description;
    }

    if (dto.monthYear !== undefined && dto.monthYear !== session.monthYear) {
      changes.monthYear = { from: session.monthYear, to: dto.monthYear };
      session.monthYear = dto.monthYear;
    }

    session.lastModifiedBy = userId;
    await this.sessionRepository.save(session);

    // Daca s-au trimis zile noi, recreeaza-le
    if (dto.days && dto.days.length > 0) {
      // Sterge zilele vechi care nu au useri asignati
      const existingDays = await this.dayRepository.find({ where: { sessionId: id } });
      const daysToDelete = existingDays.filter(d => !d.controlUser1Id && !d.controlUser2Id);
      if (daysToDelete.length > 0) {
        await this.dayRepository.remove(daysToDelete);
      }

      // Creeaza zilele noi
      const newDays = dto.days.map((dayDto) =>
        this.dayRepository.create({
          sessionId: id,
          displayDate: dayDto.displayDate,
          dayOrder: dayDto.dayOrder,
          noticeCount: dayDto.noticeCount,
          firstNoticeSeries: dayDto.firstNoticeSeries || null,
          firstNoticeNumber: dayDto.firstNoticeNumber || null,
          lastNoticeSeries: dayDto.lastNoticeSeries || null,
          lastNoticeNumber: dayDto.lastNoticeNumber || null,
          noticesDateFrom: dayDto.noticesDateFrom || null,
          noticesDateTo: dayDto.noticesDateTo || null,
          status: PV_DAY_STATUS.OPEN as PvDayStatus,
        }),
      );

      await this.dayRepository.save(newDays);
      changes.days = { updated: true, count: dto.days.length };
    }

    if (Object.keys(changes).length > 0) {
      await this.recordSessionHistory(id, 'UPDATED', userId, changes);
    }

    return this.findOneSession(id);
  }

  async deleteSession(id: string, userId: string, user: any): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot sterge sesiunile');
    }

    const session = await this.findOneSession(id);

    await this.recordSessionHistory(id, 'DELETED', userId, {
      monthYear: session.monthYear,
      status: session.status,
    });

    // CASCADE va sterge si zilele si comentariile
    await this.sessionRepository.remove(session);

    this.logger.log(`PV Display session deleted: ${id}`);
  }

  // ===== MARKETPLACE (Claim/Unclaim Days) =====

  async getAvailableDays(): Promise<PvDisplayDay[]> {
    // Returneaza zilele cu status OPEN (au sloturi libere)
    const days = await this.dayRepository.createQueryBuilder('day')
      .leftJoinAndSelect('day.session', 'session')
      .leftJoinAndSelect('day.controlUser1', 'controlUser1')
      .leftJoinAndSelect('day.controlUser2', 'controlUser2')
      .where('day.status IN (:...statuses)', { statuses: [PV_DAY_STATUS.OPEN, PV_DAY_STATUS.ASSIGNED] })
      .andWhere('session.status IN (:...sessionStatuses)', {
        sessionStatuses: [PV_SESSION_STATUS.DRAFT, PV_SESSION_STATUS.READY],
      })
      .andWhere('day.displayDate >= CURRENT_DATE')
      .orderBy('day.displayDate', 'ASC')
      .getMany();

    return days;
  }

  async getMyClaimedDays(userId: string): Promise<PvDisplayDay[]> {
    const days = await this.dayRepository.createQueryBuilder('day')
      .leftJoinAndSelect('day.session', 'session')
      .leftJoinAndSelect('day.controlUser1', 'controlUser1')
      .leftJoinAndSelect('day.controlUser2', 'controlUser2')
      .leftJoinAndSelect('day.completedByUser', 'completedByUser')
      .where('(day.controlUser1Id = :userId OR day.controlUser2Id = :userId)', { userId })
      .orderBy('day.displayDate', 'DESC')
      .getMany();

    return days;
  }

  async claimDay(dayId: string, userId: string, user: any): Promise<PvDisplayDay> {
    // Doar Control si Admin pot revendica
    const userDeptName = removeDiacritics(user.department?.name || '');
    const isControl = userDeptName === CONTROL_DEPARTMENT_NAME;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isControl && !isAdmin) {
      throw new ForbiddenException('Doar departamentul Control si administratorii pot revendica zile');
    }

    const day = await this.dayRepository.findOne({
      where: { id: dayId },
      relations: ['session', 'controlUser1', 'controlUser2'],
    });

    if (!day) {
      throw new NotFoundException(`Ziua cu ID ${dayId} nu a fost gasita`);
    }

    // Verificare: ziua nu e deja completata/in progress
    if (day.status === PV_DAY_STATUS.IN_PROGRESS || day.status === PV_DAY_STATUS.COMPLETED) {
      throw new BadRequestException('Aceasta zi nu mai poate fi revendicata');
    }

    // Verificare: userul nu e deja asignat
    if (day.controlUser1Id === userId || day.controlUser2Id === userId) {
      throw new BadRequestException('Esti deja asignat pe aceasta zi');
    }

    // Verificare: mai sunt sloturi libere
    if (day.controlUser1Id && day.controlUser2Id) {
      throw new BadRequestException('Toate sloturile sunt ocupate pe aceasta zi');
    }

    // Asigneaza pe primul slot liber
    const now = new Date();
    if (!day.controlUser1Id) {
      day.controlUser1Id = userId;
      day.controlUser1ClaimedAt = now;
    } else {
      day.controlUser2Id = userId;
      day.controlUser2ClaimedAt = now;
    }

    // Recalculeaza status
    if (day.controlUser1Id && day.controlUser2Id) {
      day.status = PV_DAY_STATUS.ASSIGNED as PvDayStatus;
    }

    await this.dayRepository.save(day);

    // History
    await this.recordDayHistory(dayId, 'CLAIMED', userId, {
      slot: day.controlUser1Id === userId ? 1 : 2,
    });

    // Recalculeaza statusul sesiunii
    await this.recalculateSessionStatus(day.sessionId);

    // Notifica daca ziua e complet asignata (2/2)
    if (day.controlUser1Id && day.controlUser2Id) {
      await this.notifyDayFullyAssigned(day);
    }

    this.logger.log(`Day ${dayId} claimed by user ${userId}`);

    return this.findOneDay(dayId);
  }

  async unclaimDay(dayId: string, userId: string, user: any): Promise<PvDisplayDay> {
    const day = await this.dayRepository.findOne({
      where: { id: dayId },
      relations: ['session'],
    });

    if (!day) {
      throw new NotFoundException(`Ziua cu ID ${dayId} nu a fost gasita`);
    }

    // Nu se poate face unclaim daca ziua e in progress sau completed
    if (day.status === PV_DAY_STATUS.IN_PROGRESS || day.status === PV_DAY_STATUS.COMPLETED) {
      throw new BadRequestException('Nu se poate renunta la o zi care este in desfasurare sau finalizata');
    }

    const isAdmin = user.role === UserRole.ADMIN;

    // Doar userul asignat sau admin pot face unclaim
    if (day.controlUser1Id === userId) {
      day.controlUser1Id = null;
      day.controlUser1ClaimedAt = null;
    } else if (day.controlUser2Id === userId) {
      day.controlUser2Id = null;
      day.controlUser2ClaimedAt = null;
    } else if (isAdmin) {
      // Admin poate face unclaim ultimului user asignat
      if (day.controlUser2Id) {
        day.controlUser2Id = null;
        day.controlUser2ClaimedAt = null;
      } else if (day.controlUser1Id) {
        day.controlUser1Id = null;
        day.controlUser1ClaimedAt = null;
      } else {
        throw new BadRequestException('Nu exista utilizatori asignati pe aceasta zi');
      }
    } else {
      throw new ForbiddenException('Nu esti asignat pe aceasta zi');
    }

    // Revert status la OPEN
    day.status = PV_DAY_STATUS.OPEN as PvDayStatus;

    await this.dayRepository.save(day);

    // History
    await this.recordDayHistory(dayId, 'UNCLAIMED', userId, {});

    // Recalculeaza statusul sesiunii
    await this.recalculateSessionStatus(day.sessionId);

    this.logger.log(`Day ${dayId} unclaimed by user ${userId}`);

    return this.findOneDay(dayId);
  }

  async adminAssignDay(dayId: string, adminId: string, dto: AdminAssignPvDayDto): Promise<PvDisplayDay> {
    const day = await this.dayRepository.findOne({
      where: { id: dayId },
      relations: ['session'],
    });

    if (!day) {
      throw new NotFoundException(`Ziua cu ID ${dayId} nu a fost gasita`);
    }

    // Verificare: userul exista si e din Control
    const targetUser = await this.userRepository.findOne({
      where: { id: dto.userId },
      relations: ['department'],
    });

    if (!targetUser) {
      throw new NotFoundException('Utilizatorul nu a fost gasit');
    }

    // Verificare: slotul nu e deja ocupat
    if (dto.slot === '1' && day.controlUser1Id) {
      throw new BadRequestException('Slotul 1 este deja ocupat');
    }
    if (dto.slot === '2' && day.controlUser2Id) {
      throw new BadRequestException('Slotul 2 este deja ocupat');
    }

    const now = new Date();
    if (dto.slot === '1') {
      day.controlUser1Id = dto.userId;
      day.controlUser1ClaimedAt = now;
    } else {
      day.controlUser2Id = dto.userId;
      day.controlUser2ClaimedAt = now;
    }

    // Recalculeaza status
    if (day.controlUser1Id && day.controlUser2Id) {
      day.status = PV_DAY_STATUS.ASSIGNED as PvDayStatus;
    } else {
      day.status = PV_DAY_STATUS.OPEN as PvDayStatus;
    }

    await this.dayRepository.save(day);

    // History
    await this.recordDayHistory(dayId, 'ADMIN_ASSIGNED', adminId, {
      userId: dto.userId,
      userName: targetUser.fullName,
      slot: dto.slot,
    });

    // Recalculeaza statusul sesiunii
    await this.recalculateSessionStatus(day.sessionId);

    // Notifica userul asignat
    await this.notificationsService.createMany([{
      userId: dto.userId,
      type: NotificationType.GENERAL,
      title: 'Asignat pe zi afisare PV',
      message: `Ai fost asignat de administrator pe o zi de afisare procese verbale (${this.formatDate(day.displayDate)}).`,
      data: { pvDayId: dayId, pvSessionId: day.sessionId },
    }]);

    if (day.controlUser1Id && day.controlUser2Id) {
      await this.notifyDayFullyAssigned(day);
    }

    return this.findOneDay(dayId);
  }

  // ===== COMPLETE DAY =====

  async completeDay(dayId: string, userId: string, dto: CompletePvDisplayDayDto, user: any): Promise<PvDisplayDay> {
    const day = await this.dayRepository.findOne({
      where: { id: dayId },
      relations: ['session'],
    });

    if (!day) {
      throw new NotFoundException(`Ziua cu ID ${dayId} nu a fost gasita`);
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const isAssigned = day.controlUser1Id === userId || day.controlUser2Id === userId;

    if (!isAdmin && !isAssigned) {
      throw new ForbiddenException('Doar utilizatorii asignati pe aceasta zi sau administratorii pot finaliza');
    }

    if (day.status === PV_DAY_STATUS.COMPLETED) {
      throw new BadRequestException('Aceasta zi a fost deja finalizata');
    }

    day.status = PV_DAY_STATUS.COMPLETED as PvDayStatus;
    day.completionObservations = dto.observations || null;
    day.completedAt = new Date();
    day.completedBy = userId;

    await this.dayRepository.save(day);

    // History
    await this.recordDayHistory(dayId, 'FINALIZED', userId, {
      observations: dto.observations,
    });

    // Recalculeaza statusul sesiunii
    await this.recalculateSessionStatus(day.sessionId);

    // Notifica PVF + Admin ca ziua a fost finalizata
    await this.notifyDayCompleted(day, userId);

    this.logger.log(`Day ${dayId} completed by user ${userId}`);

    return this.findOneDay(dayId);
  }

  // ===== COMMENTS =====

  async addComment(sessionId: string, userId: string, dto: CreateCommentDto): Promise<PvDisplaySessionComment> {
    // Verifica ca sesiunea exista
    await this.findOneSession(sessionId);

    const comment = this.commentRepository.create({
      sessionId,
      userId,
      content: dto.content,
    });

    const saved = await this.commentRepository.save(comment);

    return this.commentRepository.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
  }

  async getComments(sessionId: string): Promise<PvDisplaySessionComment[]> {
    return this.commentRepository.find({
      where: { sessionId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // ===== HISTORY =====

  async getSessionHistory(sessionId: string): Promise<ParkingHistory[]> {
    return this.historyRepository.find({
      where: { entityType: 'PV_DISPLAY_SESSION', entityId: sessionId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDayHistory(dayId: string): Promise<ParkingHistory[]> {
    return this.historyRepository.find({
      where: { entityType: 'PV_DISPLAY_DAY', entityId: dayId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // ===== HELPERS =====

  async findOneDay(dayId: string): Promise<PvDisplayDay> {
    const day = await this.dayRepository.findOne({
      where: { id: dayId },
      relations: ['session', 'controlUser1', 'controlUser2', 'completedByUser'],
    });

    if (!day) {
      throw new NotFoundException(`Ziua cu ID ${dayId} nu a fost gasita`);
    }

    return day;
  }

  async recalculateSessionStatus(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['days'],
    });

    if (!session) return;

    const days = session.days;
    if (!days || days.length === 0) return;

    const allCompleted = days.every(d => d.status === PV_DAY_STATUS.COMPLETED);
    const anyInProgress = days.some(d => d.status === PV_DAY_STATUS.IN_PROGRESS);
    const allAssignedOrBetter = days.every(d =>
      d.status === PV_DAY_STATUS.ASSIGNED ||
      d.status === PV_DAY_STATUS.IN_PROGRESS ||
      d.status === PV_DAY_STATUS.COMPLETED,
    );

    let newStatus: PvSessionStatus;

    if (allCompleted) {
      newStatus = PV_SESSION_STATUS.COMPLETED as PvSessionStatus;
    } else if (anyInProgress) {
      newStatus = PV_SESSION_STATUS.IN_PROGRESS as PvSessionStatus;
    } else if (allAssignedOrBetter) {
      newStatus = PV_SESSION_STATUS.READY as PvSessionStatus;
    } else {
      newStatus = PV_SESSION_STATUS.DRAFT as PvSessionStatus;
    }

    if (session.status !== newStatus) {
      session.status = newStatus;
      await this.sessionRepository.save(session);
      this.logger.log(`Session ${sessionId} status changed to ${newStatus}`);
    }
  }

  // ===== NOTIFICATION HELPERS =====

  private async notifySessionCreated(session: PvDisplaySession, creatorId: string): Promise<void> {
    try {
      // Notifica departamentul Control
      const controlDept = await this.departmentRepository.findOne({
        where: { name: CONTROL_DEPARTMENT_NAME },
      });

      const notifications: any[] = [];

      if (controlDept) {
        const controlUsers = await this.userRepository.find({
          where: { departmentId: controlDept.id, isActive: true },
        });

        controlUsers.forEach(u => {
          if (u.id !== creatorId) {
            notifications.push({
              userId: u.id,
              type: NotificationType.GENERAL,
              title: 'Sesiune noua afisare PV',
              message: `O noua sesiune de afisare procese verbale a fost creata pentru ${session.monthYear}. Verifica zilele disponibile in marketplace.`,
              data: { pvSessionId: session.id },
            });
          }
        });
      }

      // Notifica Admin + Manager
      const adminsManagers = await this.userRepository.find({
        where: [
          { role: UserRole.ADMIN, isActive: true },
          { role: UserRole.MANAGER, isActive: true },
        ],
      });

      adminsManagers.forEach(u => {
        if (u.id !== creatorId) {
          notifications.push({
            userId: u.id,
            type: NotificationType.GENERAL,
            title: 'Sesiune noua afisare PV',
            message: `O noua sesiune de afisare procese verbale a fost creata pentru ${session.monthYear}.`,
            data: { pvSessionId: session.id },
          });
        }
      });

      if (notifications.length > 0) {
        await this.notificationsService.createMany(notifications);
      }
    } catch (error) {
      this.logger.error(`Error notifying session created: ${error.message}`);
    }
  }

  private async notifyDayFullyAssigned(day: PvDisplayDay): Promise<void> {
    try {
      // Notifica PVF ca o zi e complet asignata
      const pvfDept = await this.departmentRepository.findOne({
        where: { name: PROCESE_VERBALE_DEPARTMENT_NAME },
      });

      const notifications: any[] = [];

      if (pvfDept) {
        const pvfUsers = await this.userRepository.find({
          where: { departmentId: pvfDept.id, isActive: true },
        });

        pvfUsers.forEach(u => {
          notifications.push({
            userId: u.id,
            type: NotificationType.GENERAL,
            title: 'Zi afisare PV - complet asignata',
            message: `Ziua ${this.formatDate(day.displayDate)} are acum 2/2 utilizatori Control asignati.`,
            data: { pvDayId: day.id, pvSessionId: day.sessionId },
          });
        });
      }

      // Notifica si Admin
      const admins = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      admins.forEach(u => {
        notifications.push({
          userId: u.id,
          type: NotificationType.GENERAL,
          title: 'Zi afisare PV - complet asignata',
          message: `Ziua ${this.formatDate(day.displayDate)} are acum 2/2 utilizatori Control asignati.`,
          data: { pvDayId: day.id, pvSessionId: day.sessionId },
        });
      });

      if (notifications.length > 0) {
        await this.notificationsService.createMany(notifications);
      }
    } catch (error) {
      this.logger.error(`Error notifying day fully assigned: ${error.message}`);
    }
  }

  private async notifyDayCompleted(day: PvDisplayDay, completedByUserId: string): Promise<void> {
    try {
      const notifications: any[] = [];

      // Notifica PVF
      const pvfDept = await this.departmentRepository.findOne({
        where: { name: PROCESE_VERBALE_DEPARTMENT_NAME },
      });

      if (pvfDept) {
        const pvfUsers = await this.userRepository.find({
          where: { departmentId: pvfDept.id, isActive: true },
        });

        pvfUsers.forEach(u => {
          notifications.push({
            userId: u.id,
            type: NotificationType.GENERAL,
            title: 'Zi afisare PV finalizata',
            message: `Ziua ${this.formatDate(day.displayDate)} a fost finalizata.`,
            data: { pvDayId: day.id, pvSessionId: day.sessionId },
          });
        });
      }

      // Notifica Admin
      const admins = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      admins.forEach(u => {
        if (u.id !== completedByUserId) {
          notifications.push({
            userId: u.id,
            type: NotificationType.GENERAL,
            title: 'Zi afisare PV finalizata',
            message: `Ziua ${this.formatDate(day.displayDate)} a fost finalizata.`,
            data: { pvDayId: day.id, pvSessionId: day.sessionId },
          });
        }
      });

      if (notifications.length > 0) {
        await this.notificationsService.createMany(notifications);
      }
    } catch (error) {
      this.logger.error(`Error notifying day completed: ${error.message}`);
    }
  }

  // ===== HISTORY HELPERS =====

  private async recordSessionHistory(
    entityId: string,
    action: string,
    userId: string,
    changes?: Record<string, any>,
  ): Promise<void> {
    const history = this.historyRepository.create({
      entityType: 'PV_DISPLAY_SESSION' as any,
      entityId,
      action: action as any,
      userId,
      changes,
    });
    await this.historyRepository.save(history);
  }

  private async recordDayHistory(
    entityId: string,
    action: string,
    userId: string,
    changes?: Record<string, any>,
  ): Promise<void> {
    const history = this.historyRepository.create({
      entityType: 'PV_DISPLAY_DAY' as any,
      entityId,
      action: action as any,
      userId,
      changes,
    });
    await this.historyRepository.save(history);
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // ===== CONTROL USERS (for admin picker) =====

  async getControlUsers(): Promise<User[]> {
    const controlDept = await this.departmentRepository.findOne({
      where: { name: CONTROL_DEPARTMENT_NAME },
    });

    if (!controlDept) return [];

    return this.userRepository.find({
      where: { departmentId: controlDept.id, isActive: true },
      order: { fullName: 'ASC' },
    });
  }
}
