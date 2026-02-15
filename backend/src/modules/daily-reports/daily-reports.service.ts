import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { DailyReport, DailyReportStatus } from './entities/daily-report.entity';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import { AdminCommentDto } from './dto/admin-comment.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { WorkPosition } from '../schedules/entities/work-position.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import {
  DISPECERAT_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
  ACHIZITII_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
  HANDICAP_PARKING_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
  PROCESE_VERBALE_DEPARTMENT_NAME,
} from '../parking/constants/parking.constants';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import { isWorkingDay } from './constants/romanian-holidays';

// Departamente cu obligativitate raport in fiecare zi lucratoare
const WORKDAY_REPORT_DEPARTMENTS = [
  ACHIZITII_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
  HANDICAP_PARKING_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
  PROCESE_VERBALE_DEPARTMENT_NAME,
];

// Departamente cu obligativitate raport doar in zilele cu tura
const SCHEDULE_BASED_DEPARTMENTS = [
  DISPECERAT_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
];

@Injectable()
export class DailyReportsService {
  private readonly logger = new Logger(DailyReportsService.name);

  constructor(
    @InjectRepository(DailyReport)
    private readonly dailyReportRepository: Repository<DailyReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(ScheduleAssignment)
    private readonly scheduleAssignmentRepository: Repository<ScheduleAssignment>,
    @InjectRepository(WorkPosition)
    private readonly workPositionRepository: Repository<WorkPosition>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async create(userId: string, dto: CreateDailyReportDto): Promise<DailyReport> {
    const date = dto.date || new Date().toISOString().split('T')[0];
    const status = dto.status || DailyReportStatus.DRAFT;

    // Verifica daca exista deja un raport pt aceasta zi
    const existing = await this.dailyReportRepository.findOne({
      where: { userId, date: date as any },
    });

    if (existing) {
      // Update raportul existent
      if (existing.status === DailyReportStatus.SUBMITTED) {
        throw new ForbiddenException('Raportul a fost deja trimis si nu mai poate fi modificat.');
      }
      existing.content = dto.content;
      existing.status = status;
      const saved = await this.dailyReportRepository.save(existing);

      if (status === DailyReportStatus.SUBMITTED) {
        await this.notifyOnSubmission(saved, userId);
      }

      return this.findOne(saved.id);
    }

    // Creeaza raport nou
    const report = this.dailyReportRepository.create({
      userId,
      date: date as any,
      content: dto.content,
      status,
    });

    const saved = await this.dailyReportRepository.save(report);

    if (status === DailyReportStatus.SUBMITTED) {
      await this.notifyOnSubmission(saved, userId);
    }

    return this.findOne(saved.id);
  }

  async update(id: string, userId: string, dto: UpdateDailyReportDto): Promise<DailyReport> {
    const report = await this.dailyReportRepository.findOne({
      where: { id, userId },
    });

    if (!report) {
      throw new NotFoundException('Raportul nu a fost gasit.');
    }

    if (report.status === DailyReportStatus.SUBMITTED) {
      throw new ForbiddenException('Raportul a fost deja trimis si nu mai poate fi modificat.');
    }

    if (dto.content !== undefined) {
      report.content = dto.content;
    }
    if (dto.status !== undefined) {
      report.status = dto.status;
    }

    const saved = await this.dailyReportRepository.save(report);

    // Notifica doar la tranzitia DRAFT → SUBMITTED
    if (saved.status === DailyReportStatus.SUBMITTED) {
      await this.notifyOnSubmission(saved, userId);
    }

    return this.findOne(saved.id);
  }

  async findOne(id: string): Promise<DailyReport> {
    const report = await this.dailyReportRepository.findOne({
      where: { id },
      relations: ['user', 'user.department', 'adminCommentedBy'],
    });

    if (!report) {
      throw new NotFoundException('Raportul nu a fost gasit.');
    }

    return report;
  }

  async getTodayReport(userId: string): Promise<DailyReport | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.dailyReportRepository.findOne({
      where: { userId, date: today as any },
      relations: ['adminCommentedBy'],
    });
  }

  async findMyReports(userId: string, startDate?: string, endDate?: string): Promise<DailyReport[]> {
    const where: any = { userId };

    if (startDate && endDate) {
      where.date = Between(startDate, endDate);
    }

    return this.dailyReportRepository.find({
      where,
      relations: ['adminCommentedBy'],
      order: { date: 'DESC' },
    });
  }

  async findAllForAdmin(
    startDate?: string,
    endDate?: string,
    userId?: string,
    departmentId?: string,
  ): Promise<DailyReport[]> {
    const query = this.dailyReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.user', 'user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('report.adminCommentedBy', 'commentedBy')
      .where('report.status = :status', { status: DailyReportStatus.SUBMITTED });

    if (startDate && endDate) {
      query.andWhere('report.date BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    if (userId) {
      query.andWhere('report.user_id = :userId', { userId });
    }

    if (departmentId) {
      query.andWhere('user.departmentId = :departmentId', { departmentId });
    }

    return query.orderBy('report.date', 'DESC').addOrderBy('user.fullName', 'ASC').getMany();
  }

  async findAllForManager(
    startDate?: string,
    endDate?: string,
  ): Promise<DailyReport[]> {
    // Gaseste departamentele Dispecerat, Control si Achizitii
    const dispeceratDept = await this.departmentRepository.findOne({
      where: { name: DISPECERAT_DEPARTMENT_NAME },
    });
    const controlDept = await this.departmentRepository.findOne({
      where: { name: CONTROL_DEPARTMENT_NAME },
    });
    const achizitiiDept = await this.departmentRepository.findOne({
      where: { name: ACHIZITII_DEPARTMENT_NAME },
    });

    if (!dispeceratDept && !achizitiiDept) {
      return [];
    }

    // Rapoartele relevante pentru manager
    const query = this.dailyReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.user', 'user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('report.adminCommentedBy', 'commentedBy')
      .where('report.status = :status', { status: DailyReportStatus.SUBMITTED });

    if (startDate && endDate) {
      query.andWhere('report.date BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    // Sub-query: user din Dispecerat SAU Control(cu DISP) SAU Achizitii
    const departmentConditions: string[] = [];
    const params: any = { status: DailyReportStatus.SUBMITTED };

    // Conditia 1: User din Dispecerat
    if (dispeceratDept) {
      departmentConditions.push('user.departmentId = :dispeceratId');
      params.dispeceratId = dispeceratDept.id;
    }

    // Conditia 2: User din Control care a lucrat in Dispecerat
    if (controlDept) {
      departmentConditions.push(
        `(user.departmentId = :controlId AND EXISTS (
          SELECT 1 FROM schedule_assignments sa
          INNER JOIN work_positions wp ON wp.id = sa.work_position_id
          WHERE sa.user_id = report.user_id
          AND sa.shift_date = report.date
          AND sa.is_rest_day = false
          AND wp.short_name = 'DISP'
        ))`,
      );
      params.controlId = controlDept.id;
    }

    // Conditia 3: User din Achizitii
    if (achizitiiDept) {
      departmentConditions.push('user.departmentId = :achizitiiId');
      params.achizitiiId = achizitiiDept.id;
    }

    if (departmentConditions.length > 0) {
      query.andWhere(`(${departmentConditions.join(' OR ')})`, params);
    }

    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }

    return query.orderBy('report.date', 'DESC').addOrderBy('user.fullName', 'ASC').getMany();
  }

  async addAdminComment(
    reportId: string,
    adminId: string,
    dto: AdminCommentDto,
  ): Promise<DailyReport> {
    const report = await this.dailyReportRepository.findOne({
      where: { id: reportId },
      relations: ['user'],
    });

    if (!report) {
      throw new NotFoundException('Raportul nu a fost gasit.');
    }

    report.adminComment = dto.comment;
    report.adminCommentedAt = new Date();
    report.adminCommentedById = adminId;

    await this.dailyReportRepository.save(report);

    // Notifica autorul raportului
    try {
      const admin = await this.userRepository.findOne({ where: { id: adminId } });
      const adminName = admin?.fullName || 'Admin';

      await this.notificationsService.create({
        userId: report.userId,
        type: NotificationType.DAILY_REPORT_COMMENTED,
        title: 'Comentariu la raportul zilnic',
        message: `${adminName} a adaugat un comentariu la raportul tau din ${this.formatDate(report.date)}.`,
        data: { dailyReportId: report.id },
      });

      await this.pushNotificationService.sendToUser(
        report.userId,
        'Comentariu la raportul zilnic',
        `${adminName} a adaugat un comentariu la raportul tau.`,
        { type: 'DAILY_REPORT_COMMENTED', dailyReportId: report.id },
      );
    } catch (error) {
      this.logger.error(`Eroare la trimiterea notificarii de comentariu: ${error.message}`);
    }

    return this.findOne(reportId);
  }

  async getWeeklyReportsForAdmin(startDate: Date, endDate: Date): Promise<DailyReport[]> {
    return this.dailyReportRepository.find({
      where: {
        status: DailyReportStatus.SUBMITTED,
        date: Between(
          startDate.toISOString().split('T')[0] as any,
          endDate.toISOString().split('T')[0] as any,
        ),
      },
      relations: ['user', 'user.department', 'adminCommentedBy'],
      order: { date: 'ASC', user: { fullName: 'ASC' } },
    });
  }

  async getWeeklyReportsForManager(startDate: Date, endDate: Date): Promise<DailyReport[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return this.findAllForManager(start, end);
  }

  // ============== RAPOARTE LIPSA ==============

  /**
   * Returneaza utilizatorii care ar trebui sa trimita raport intr-o anumita zi
   */
  async getUsersWhoShouldReport(date: string): Promise<User[]> {
    // Weekend sau sarbatoare → nimeni nu face raport
    if (!isWorkingDay(date)) {
      return [];
    }

    // Toti userii activi non-ADMIN cu departament
    const allUsers = await this.userRepository.find({
      where: { isActive: true },
      relations: ['department'],
    });
    const nonAdminUsers = allUsers.filter(u => u.role !== UserRole.ADMIN);

    // Userii in concediu aprobat pe aceasta data
    const usersOnLeave = await this.leaveRequestRepository
      .createQueryBuilder('lr')
      .select('lr.user_id', 'userId')
      .where('lr.status = :status', { status: 'APPROVED' })
      .andWhere('lr.start_date <= :date', { date })
      .andWhere('lr.end_date >= :date', { date })
      .getRawMany();

    const onLeaveUserIds = new Set(usersOnLeave.map(lr => lr.userId));

    // Filtreaza userii care NU sunt in concediu
    const availableUsers = nonAdminUsers.filter(u => !onLeaveUserIds.has(u.id));

    // Clasificare pe departamente
    const scheduleBased: User[] = [];
    const workdayBased: User[] = [];

    for (const user of availableUsers) {
      const deptName = user.department?.name;

      // Managerii fac raport in fiecare zi lucratoare (indiferent de departament)
      if (user.role === UserRole.MANAGER) {
        workdayBased.push(user);
        continue;
      }

      if (deptName && SCHEDULE_BASED_DEPARTMENTS.includes(deptName)) {
        scheduleBased.push(user);
      } else if (deptName && WORKDAY_REPORT_DEPARTMENTS.includes(deptName)) {
        workdayBased.push(user);
      }
      // Userii din alte departamente (ex: Intretinere Parcari) nu fac raport
    }

    // Pentru userii cu program: verifica daca au tura in acea zi
    const scheduleBasedIds = scheduleBased.map(u => u.id);
    const usersWithShifts = new Set<string>();

    if (scheduleBasedIds.length > 0) {
      const assignments = await this.scheduleAssignmentRepository
        .createQueryBuilder('sa')
        .innerJoin('sa.schedule', 'ws')
        .select('DISTINCT sa.user_id', 'userId')
        .where('sa.shift_date = :date', { date })
        .andWhere('sa.is_rest_day = false')
        .andWhere('sa.leave_type IS NULL')
        .andWhere('ws.status = :wsStatus', { wsStatus: 'APPROVED' })
        .andWhere('sa.user_id IN (:...userIds)', { userIds: scheduleBasedIds })
        .getRawMany();

      assignments.forEach(a => usersWithShifts.add(a.userId));
    }

    const scheduleBasedFiltered = scheduleBased.filter(u => usersWithShifts.has(u.id));

    // Deduplicate (un manager din Dispecerat poate aparea in ambele liste)
    const resultMap = new Map<string, User>();
    [...workdayBased, ...scheduleBasedFiltered].forEach(u => resultMap.set(u.id, u));

    return Array.from(resultMap.values());
  }

  /**
   * Returneaza utilizatorii care ar fi trebuit sa trimita raport dar NU au trimis
   */
  async getMissingReports(date: string): Promise<User[]> {
    const usersWhoShouldReport = await this.getUsersWhoShouldReport(date);
    if (usersWhoShouldReport.length === 0) return [];

    const userIds = usersWhoShouldReport.map(u => u.id);

    // Gaseste cine a trimis deja
    const submittedReports = await this.dailyReportRepository.find({
      where: {
        date: date as any,
        status: DailyReportStatus.SUBMITTED,
        userId: In(userIds),
      },
      select: ['userId'],
    });

    const submittedUserIds = new Set(submittedReports.map(r => r.userId));

    return usersWhoShouldReport.filter(u => !submittedUserIds.has(u.id));
  }

  /**
   * Returneaza rapoartele lipsa pentru un interval de date
   */
  async getMissingReportsForDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Array<{ date: string; users: Array<{ id: string; fullName: string; department: { id: string; name: string } | null }> }>> {
    const result: Array<{ date: string; users: Array<{ id: string; fullName: string; department: { id: string; name: string } | null }> }> = [];
    const current = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const missingUsers = await this.getMissingReports(dateStr);

      if (missingUsers.length > 0) {
        result.push({
          date: dateStr,
          users: missingUsers.map(u => ({
            id: u.id,
            fullName: u.fullName,
            department: u.department ? { id: u.department.id, name: u.department.name } : null,
          })),
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  // ============== NOTIFICARI ==============

  private async notifyOnSubmission(report: DailyReport, userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['department'],
      });

      if (!user) return;

      const notificationsToCreate: any[] = [];
      const pushUserIds: string[] = [];

      // 1. Notifica TOTI adminii activi
      const admins = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      for (const admin of admins) {
        if (admin.id === userId) continue; // Nu te notifica pe tine insuti
        notificationsToCreate.push({
          userId: admin.id,
          type: NotificationType.DAILY_REPORT_SUBMITTED,
          title: 'Raport zilnic nou',
          message: `${user.fullName} a trimis raportul zilnic pentru ${this.formatDate(report.date)}.`,
          data: { dailyReportId: report.id, reportUserId: user.id },
        });
        pushUserIds.push(admin.id);
      }

      // 2. Notifica manageri pe baza regulilor
      const shouldNotifyManagers = await this.shouldNotifyManagers(user, report.date);

      if (shouldNotifyManagers) {
        const managers = await this.userRepository.find({
          where: { role: UserRole.MANAGER, isActive: true },
        });

        for (const manager of managers) {
          if (manager.id === userId) continue;
          // Evita duplicate (daca managerul e si admin)
          if (pushUserIds.includes(manager.id)) continue;

          notificationsToCreate.push({
            userId: manager.id,
            type: NotificationType.DAILY_REPORT_SUBMITTED,
            title: 'Raport zilnic nou',
            message: `${user.fullName} a trimis raportul zilnic pentru ${this.formatDate(report.date)}.`,
            data: { dailyReportId: report.id, reportUserId: user.id },
          });
          pushUserIds.push(manager.id);
        }
      }

      // Salveaza notificari in-app
      if (notificationsToCreate.length > 0) {
        await this.notificationsService.createMany(notificationsToCreate);
      }

      // Trimite push notifications
      if (pushUserIds.length > 0) {
        await this.pushNotificationService.sendToUsers(
          pushUserIds,
          'Raport zilnic nou',
          `${user.fullName} a trimis raportul zilnic.`,
          { type: 'DAILY_REPORT_SUBMITTED', dailyReportId: report.id },
        );
      }

      this.logger.log(
        `Notificari trimise pentru raportul zilnic al lui ${user.fullName}: ${notificationsToCreate.length} in-app, ${pushUserIds.length} push`,
      );
    } catch (error) {
      this.logger.error(`Eroare la trimiterea notificarilor de raport zilnic: ${error.message}`);
    }
  }

  private async shouldNotifyManagers(user: User, reportDate: Date): Promise<boolean> {
    if (!user.department) return false;

    const departmentName = user.department.name;

    // Daca e din Dispecerat → notifica managerii
    if (departmentName === DISPECERAT_DEPARTMENT_NAME) {
      return true;
    }

    // Daca e din Control → verifica daca a lucrat in Dispecerat in acea zi
    if (departmentName === CONTROL_DEPARTMENT_NAME) {
      const dateStr = typeof reportDate === 'string' ? reportDate : new Date(reportDate).toISOString().split('T')[0];

      const assignment = await this.scheduleAssignmentRepository
        .createQueryBuilder('sa')
        .innerJoin('sa.workPosition', 'wp')
        .where('sa.user_id = :userId', { userId: user.id })
        .andWhere('sa.shift_date = :date', { date: dateStr })
        .andWhere('sa.is_rest_day = false')
        .andWhere("wp.short_name = 'DISP'")
        .getOne();

      return !!assignment;
    }

    // Orice alt departament → nu notifica managerii
    return false;
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
