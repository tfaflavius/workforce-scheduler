import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { LeaveRequest, LeaveType, LeaveRequestStatus } from './entities/leave-request.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { RespondLeaveRequestDto } from './dto/respond-leave-request.dto';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { Department } from '../departments/entities/department.entity';
import { EmailService } from '../../common/email/email.service';

// Default days per leave type
const DEFAULT_LEAVE_DAYS: Record<LeaveType, number> = {
  VACATION: 21,
  MEDICAL: 180,
  BIRTHDAY: 1,
  SPECIAL: 5,
  EXTRA_DAYS: 0,
};

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  VACATION: 'Concediu de Odihna',
  MEDICAL: 'Concediu Medical',
  BIRTHDAY: 'Concediu Zi de Nastere',
  SPECIAL: 'Concediu Special',
  EXTRA_DAYS: 'Zile Suplimentare',
};

@Injectable()
export class LeaveRequestsService {
  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(LeaveBalance)
    private leaveBalanceRepository: Repository<LeaveBalance>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ScheduleAssignment)
    private scheduleAssignmentRepository: Repository<ScheduleAssignment>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    private notificationsService: NotificationsService,
    private pushNotificationService: PushNotificationService,
    private emailService: EmailService,
  ) {}

  async create(userId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });

    if (!user) {
      throw new NotFoundException('Utilizatorul nu a fost gasit');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate date range
    if (startDate > endDate) {
      throw new BadRequestException('Data de inceput trebuie sa fie inainte de data de sfarsit');
    }

    // Calculate number of days
    const days = this.calculateBusinessDays(startDate, endDate);

    // Validate 1 day in advance (except for MEDICAL)
    if (dto.leaveType !== 'MEDICAL') {
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + 1);

      if (startDate < minDate) {
        throw new BadRequestException(
          'Cererea trebuie facuta cu cel putin 1 zi in avans (exceptie: Concediu Medical)',
        );
      }
    }

    // Validate BIRTHDAY leave type
    if (dto.leaveType === 'BIRTHDAY') {
      if (!user.birthDate) {
        throw new BadRequestException(
          'Pentru a solicita Concediu de Zi de Nastere, trebuie sa completezi data nasterii in profilul tau',
        );
      }

      const birthDate = new Date(user.birthDate);
      const startMonth = startDate.getMonth();
      const startDay = startDate.getDate();
      const birthMonth = birthDate.getMonth();
      const birthDay = birthDate.getDate();

      if (startMonth !== birthMonth || startDay !== birthDay) {
        throw new BadRequestException(
          'Concediul pentru Zi de Nastere poate fi solicitat doar pentru ziua si luna nasterii tale',
        );
      }

      // Birthday leave is only 1 day
      if (days > 1) {
        throw new BadRequestException('Concediul pentru Zi de Nastere este valabil doar pentru o zi');
      }
    }

    // Check leave balance only for BIRTHDAY and MEDICAL
    // VACATION, SPECIAL, and EXTRA_DAYS have no limits
    const year = startDate.getFullYear();
    let balance = await this.getOrCreateBalance(userId, dto.leaveType, year);

    // Only enforce balance limits for BIRTHDAY and MEDICAL leave types
    const typesWithBalanceLimit: LeaveType[] = ['BIRTHDAY', 'MEDICAL'];
    if (typesWithBalanceLimit.includes(dto.leaveType) && balance.remainingDays < days) {
      throw new BadRequestException(
        `Nu ai suficiente zile de ${LEAVE_TYPE_LABELS[dto.leaveType]}. Disponibile: ${balance.remainingDays}, solicitate: ${days}`,
      );
    }

    // Check for overlapping requests from the same user
    const overlapping = await this.leaveRequestRepository.findOne({
      where: [
        {
          userId,
          status: 'PENDING',
          startDate: LessThanOrEqual(endDate),
          endDate: MoreThanOrEqual(startDate),
        },
        {
          userId,
          status: 'APPROVED',
          startDate: LessThanOrEqual(endDate),
          endDate: MoreThanOrEqual(startDate),
        },
      ],
    });

    if (overlapping) {
      throw new BadRequestException(
        'Ai deja o cerere de concediu pentru aceasta perioada',
      );
    }

    // Create the leave request
    const leaveRequest = this.leaveRequestRepository.create({
      userId,
      leaveType: dto.leaveType,
      startDate,
      endDate,
      reason: dto.reason,
      status: 'PENDING',
    });

    await this.leaveRequestRepository.save(leaveRequest);

    // Notify admins
    await this.notifyAdminsAboutNewRequest(leaveRequest, user);

    return this.findOne(leaveRequest.id);
  }

  async getMyRequests(userId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestRepository.find({
      where: { userId },
      relations: ['user', 'admin'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMyBalance(userId: string, year?: number): Promise<LeaveBalance[]> {
    const targetYear = year || new Date().getFullYear();

    // Ensure balances exist for all leave types
    const leaveTypes: LeaveType[] = ['VACATION', 'MEDICAL', 'BIRTHDAY', 'SPECIAL', 'EXTRA_DAYS'];

    for (const leaveType of leaveTypes) {
      await this.getOrCreateBalance(userId, leaveType, targetYear);
    }

    return this.leaveBalanceRepository.find({
      where: { userId, year: targetYear },
      order: { leaveType: 'ASC' },
    });
  }

  async getAllRequests(status?: LeaveRequestStatus): Promise<LeaveRequest[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.leaveRequestRepository.find({
      where,
      relations: ['user', 'user.department', 'admin'],
      order: { createdAt: 'DESC' },
    });
  }

  async getApprovedByMonth(monthYear: string): Promise<{ userId: string; dates: string[]; leaveType: string }[]> {
    // Parse monthYear (format: YYYY-MM)
    const [year, month] = monthYear.split('-').map(Number);

    // Get first and last day of the month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // Last day of month

    // Find all approved leave requests that overlap with this month
    const approvedRequests = await this.leaveRequestRepository.find({
      where: {
        status: 'APPROVED',
        startDate: LessThanOrEqual(monthEnd),
        endDate: MoreThanOrEqual(monthStart),
      },
      relations: ['user'],
    });

    // Build result with specific dates for each user
    const result: { userId: string; dates: string[]; leaveType: string }[] = [];

    for (const request of approvedRequests) {
      const dates: string[] = [];
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);

      // Iterate through each day in the leave period
      const current = new Date(Math.max(startDate.getTime(), monthStart.getTime()));
      const end = new Date(Math.min(endDate.getTime(), monthEnd.getTime()));

      while (current <= end) {
        const dayOfWeek = current.getDay();
        // Skip weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Format as YYYY-MM-DD
          const dateStr = current.toISOString().split('T')[0];
          dates.push(dateStr);
        }
        current.setDate(current.getDate() + 1);
      }

      if (dates.length > 0) {
        result.push({
          userId: request.userId,
          dates,
          leaveType: request.leaveType,
        });
      }
    }

    return result;
  }

  async findOne(id: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findOne({
      where: { id },
      relations: ['user', 'user.department', 'admin'],
    });

    if (!request) {
      throw new NotFoundException('Cererea de concediu nu a fost gasita');
    }

    return request;
  }

  async checkOverlaps(id: string): Promise<LeaveRequest[]> {
    const request = await this.findOne(id);

    if (!request.user?.departmentId) {
      return [];
    }

    // Find other approved or pending requests from the same department
    // that overlap with this request's dates
    const overlaps = await this.leaveRequestRepository
      .createQueryBuilder('lr')
      .innerJoinAndSelect('lr.user', 'user')
      .where('user.departmentId = :departmentId', { departmentId: request.user.departmentId })
      .andWhere('lr.id != :requestId', { requestId: id })
      .andWhere('lr.status IN (:...statuses)', { statuses: ['PENDING', 'APPROVED'] })
      .andWhere('lr.startDate <= :endDate', { endDate: request.endDate })
      .andWhere('lr.endDate >= :startDate', { startDate: request.startDate })
      .getMany();

    return overlaps;
  }

  async respond(
    id: string,
    adminId: string,
    dto: RespondLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Aceasta cerere a fost deja procesata');
    }

    request.status = dto.status as LeaveRequestStatus;
    request.adminId = adminId;
    request.adminMessage = dto.message;
    request.respondedAt = new Date();

    await this.leaveRequestRepository.save(request);

    if (dto.status === 'APPROVED') {
      // Update leave balance
      const days = this.calculateBusinessDays(
        new Date(request.startDate),
        new Date(request.endDate),
      );
      const year = new Date(request.startDate).getFullYear();

      await this.leaveBalanceRepository
        .createQueryBuilder()
        .update(LeaveBalance)
        .set({ usedDays: () => `used_days + ${days}` })
        .where('userId = :userId', { userId: request.userId })
        .andWhere('leaveType = :leaveType', { leaveType: request.leaveType })
        .andWhere('year = :year', { year })
        .execute();

      // Create schedule assignments for the leave period
      await this.createLeaveAssignments(request);
    }

    // Notify the user
    await this.notifyUserAboutResponse(request, dto.status === 'APPROVED');

    // If approved, notify the department manager
    if (dto.status === 'APPROVED' && request.user?.departmentId) {
      await this.notifyManagerAboutApproval(request);
    }

    return this.findOne(id);
  }

  async cancel(id: string, userId: string): Promise<void> {
    const request = await this.findOne(id);

    if (request.userId !== userId) {
      throw new ForbiddenException('Nu poti anula cererea altui utilizator');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Doar cererile in asteptare pot fi anulate');
    }

    await this.leaveRequestRepository.remove(request);
  }

  async getUserBalance(userId: string, year?: number): Promise<LeaveBalance[]> {
    return this.getMyBalance(userId, year);
  }

  async updateUserBalance(
    userId: string,
    dto: UpdateLeaveBalanceDto,
    year?: number,
  ): Promise<LeaveBalance> {
    const targetYear = year || new Date().getFullYear();

    let balance = await this.leaveBalanceRepository.findOne({
      where: { userId, leaveType: dto.leaveType, year: targetYear },
    });

    if (!balance) {
      balance = this.leaveBalanceRepository.create({
        userId,
        leaveType: dto.leaveType,
        year: targetYear,
        totalDays: dto.totalDays,
        usedDays: dto.usedDays || 0,
      });
    } else {
      balance.totalDays = dto.totalDays;
      if (dto.usedDays !== undefined) {
        balance.usedDays = dto.usedDays;
      }
    }

    return this.leaveBalanceRepository.save(balance);
  }

  // Private helper methods

  private async getOrCreateBalance(
    userId: string,
    leaveType: LeaveType,
    year: number,
  ): Promise<LeaveBalance> {
    let balance = await this.leaveBalanceRepository.findOne({
      where: { userId, leaveType, year },
    });

    if (!balance) {
      balance = this.leaveBalanceRepository.create({
        userId,
        leaveType,
        year,
        totalDays: DEFAULT_LEAVE_DAYS[leaveType],
        usedDays: 0,
      });
      await this.leaveBalanceRepository.save(balance);
    }

    return balance;
  }

  private calculateBusinessDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count || 1; // Minimum 1 day
  }

  private async createLeaveAssignments(request: LeaveRequest): Promise<void> {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();

      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Check if assignment already exists for this date
        const existing = await this.scheduleAssignmentRepository.findOne({
          where: {
            userId: request.userId,
            shiftDate: current,
          },
        });

        if (existing) {
          // Update existing assignment
          existing.isRestDay = true;
          existing.leaveType = request.leaveType;
          existing.notes = `Concediu: ${LEAVE_TYPE_LABELS[request.leaveType]}`;
          await this.scheduleAssignmentRepository.save(existing);
        } else {
          // Create new assignment for leave
          const newAssignment = this.scheduleAssignmentRepository.create({
            userId: request.userId,
            shiftDate: current,
            isRestDay: true,
            leaveType: request.leaveType,
            notes: `Concediu: ${LEAVE_TYPE_LABELS[request.leaveType]}`,
          });
          await this.scheduleAssignmentRepository.save(newAssignment);
        }
      }

      current.setDate(current.getDate() + 1);
    }
  }

  private async notifyAdminsAboutNewRequest(
    request: LeaveRequest,
    user: User,
  ): Promise<void> {
    const admins = await this.userRepository.find({
      where: { role: 'ADMIN' as any, isActive: true },
    });

    const startDate = new Date(request.startDate).toLocaleDateString('ro-RO');
    const endDate = new Date(request.endDate).toLocaleDateString('ro-RO');
    const days = this.calculateBusinessDays(new Date(request.startDate), new Date(request.endDate));

    for (const admin of admins) {
      // Notificare in-app
      await this.notificationsService.create({
        userId: admin.id,
        type: NotificationType.LEAVE_REQUEST_CREATED,
        title: 'Cerere Noua de Concediu',
        message: `${user.fullName} a solicitat ${LEAVE_TYPE_LABELS[request.leaveType]} pentru perioada ${startDate} - ${endDate}`,
        data: {
          leaveRequestId: request.id,
          userId: user.id,
          userName: user.fullName,
          leaveType: request.leaveType,
          startDate: request.startDate,
          endDate: request.endDate,
        },
      });

      // Push notification cu URL catre pagina de gestionare concedii
      await this.pushNotificationService.sendToUser(
        admin.id,
        '📋 Cerere Noua de Concediu',
        `${user.fullName} a solicitat ${LEAVE_TYPE_LABELS[request.leaveType]} (${startDate} - ${endDate})`,
        { url: '/admin/leave-requests' },
      );

      // Email catre admin
      await this.emailService.sendLeaveRequestNotificationToApprover(
        admin.email,
        admin.fullName,
        user.fullName,
        request.leaveType,
        request.startDate.toISOString(),
        request.endDate.toISOString(),
        days,
      );
    }

    // Email confirmare catre angajat
    const leaveTypeMap: Record<string, 'ANNUAL' | 'SICK' | 'UNPAID' | 'OTHER'> = {
      'VACATION': 'ANNUAL',
      'MEDICAL': 'SICK',
      'BIRTHDAY': 'OTHER',
      'SPECIAL': 'OTHER',
      'EXTRA_DAYS': 'OTHER',
    };

    await this.emailService.sendLeaveRequestNotification({
      employeeEmail: user.email,
      employeeName: user.fullName,
      leaveType: leaveTypeMap[request.leaveType] || 'OTHER',
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      totalDays: days,
      status: 'submitted',
    });
  }

  private async notifyUserAboutResponse(
    request: LeaveRequest,
    approved: boolean,
  ): Promise<void> {
    const startDate = new Date(request.startDate).toLocaleDateString('ro-RO');
    const endDate = new Date(request.endDate).toLocaleDateString('ro-RO');
    const days = this.calculateBusinessDays(new Date(request.startDate), new Date(request.endDate));

    // Notificare in-app
    await this.notificationsService.create({
      userId: request.userId,
      type: approved
        ? NotificationType.LEAVE_REQUEST_APPROVED
        : NotificationType.LEAVE_REQUEST_REJECTED,
      title: approved ? 'Concediu Aprobat' : 'Concediu Respins',
      message: approved
        ? `Cererea ta de ${LEAVE_TYPE_LABELS[request.leaveType]} pentru ${startDate} - ${endDate} a fost aprobata.${request.adminMessage ? ` Mesaj: ${request.adminMessage}` : ''}`
        : `Cererea ta de ${LEAVE_TYPE_LABELS[request.leaveType]} pentru ${startDate} - ${endDate} a fost respinsa.${request.adminMessage ? ` Motiv: ${request.adminMessage}` : ''}`,
      data: {
        leaveRequestId: request.id,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        approved,
        adminMessage: request.adminMessage,
      },
    });

    // Push notification cu URL catre programul utilizatorului
    await this.pushNotificationService.sendToUser(
      request.userId,
      approved ? '✅ Concediu Aprobat' : '❌ Concediu Respins',
      approved
        ? `Cererea ta de ${LEAVE_TYPE_LABELS[request.leaveType]} (${startDate} - ${endDate}) a fost aprobata!`
        : `Cererea ta de ${LEAVE_TYPE_LABELS[request.leaveType]} (${startDate} - ${endDate}) a fost respinsa.`,
      { url: '/schedules' },
    );

    // Email catre angajat
    const user = await this.userRepository.findOne({ where: { id: request.userId } });
    if (user) {
      const admin = request.adminId
        ? await this.userRepository.findOne({ where: { id: request.adminId } })
        : null;

      const leaveTypeMap: Record<string, 'ANNUAL' | 'SICK' | 'UNPAID' | 'OTHER'> = {
        'VACATION': 'ANNUAL',
        'MEDICAL': 'SICK',
        'BIRTHDAY': 'OTHER',
        'SPECIAL': 'OTHER',
        'EXTRA_DAYS': 'OTHER',
      };

      await this.emailService.sendLeaveRequestNotification({
        employeeEmail: user.email,
        employeeName: user.fullName,
        leaveType: leaveTypeMap[request.leaveType] || 'OTHER',
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
        totalDays: days,
        status: approved ? 'approved' : 'rejected',
        rejectionReason: !approved ? request.adminMessage : undefined,
        approverName: admin?.fullName,
      });
    }
  }

  private async notifyManagerAboutApproval(request: LeaveRequest): Promise<void> {
    if (!request.user?.departmentId) return;

    const department = await this.departmentRepository.findOne({
      where: { id: request.user.departmentId },
      relations: ['manager'],
    });

    if (!department?.managerId || department.managerId === request.userId) return;

    const startDate = new Date(request.startDate).toLocaleDateString('ro-RO');
    const endDate = new Date(request.endDate).toLocaleDateString('ro-RO');

    await this.notificationsService.create({
      userId: department.managerId,
      type: NotificationType.LEAVE_REQUEST_APPROVED,
      title: 'Concediu Aprobat in Departament',
      message: `${request.user.fullName} din departamentul ${department.name} are ${LEAVE_TYPE_LABELS[request.leaveType]} aprobat pentru ${startDate} - ${endDate}`,
      data: {
        leaveRequestId: request.id,
        userId: request.userId,
        userName: request.user.fullName,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        departmentName: department.name,
      },
    });
  }
}
