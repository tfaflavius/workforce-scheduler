import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entities
import { User } from '../users/entities/user.entity';
import { WorkSchedule } from '../schedules/entities/work-schedule.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { ParkingIssue } from '../parking/entities/parking-issue.entity';
import { ParkingDamage } from '../parking/entities/parking-damage.entity';
import { CashCollection } from '../parking/entities/cash-collection.entity';
import { EditRequest } from '../parking/entities/edit-request.entity';
import { HandicapRequest } from '../parking/entities/handicap-request.entity';
import { HandicapLegitimation } from '../parking/entities/handicap-legitimation.entity';
import { RevolutionarLegitimation } from '../parking/entities/revolutionar-legitimation.entity';
import { ShiftSwapRequest, ShiftSwapStatus } from '../shift-swaps/entities/shift-swap-request.entity';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { PvDisplayDay } from '../parking/entities/pv-display-day.entity';
import { PV_DAY_STATUS } from '../parking/constants/parking.constants';

interface DashboardStatsResponse {
  schedules: {
    pending: number;
    approved: number;
    rejected: number;
    draft: number;
  };
  todayDispatchers: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string | undefined;
    departmentName: string;
    shiftType: string;
    shiftCode: string;
    startTime: string | undefined;
    endTime: string | undefined;
    workPosition: string;
    workPositionCode: string;
  }[];
  activeUsersCount: number;
  shiftSwaps: {
    pendingAdmin: number;
    total: number;
  };
  leaveRequests: {
    pending: number;
    total: number;
  };
  parking: {
    activeIssues: number;
    urgentIssues: { id: string; equipment: string; parkingLotId: string; createdAt: Date }[];
    activeDamages: number;
    urgentDamages: { id: string; damagedEquipment: string; parkingLotId: string; createdAt: Date }[];
    pendingEditRequests: number;
    cashCollectionTotals: { totalAmount: number; count: number };
  };
  handicap: {
    requestsByType: {
      amplasare: number;
      revocare: number;
      marcaje: number;
    };
    legitimationsCount: number;
    revolutionarCount: number;
  };
  recentNotifications: {
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt: Date;
  }[];
  carStatus: {
    carInUse: boolean;
    activeDaysCount: number;
    days: {
      id: string;
      dayOrder: number;
      displayDate: string;
      controlUser1Name: string | null;
      controlUser2Name: string | null;
      estimatedReturn: string;
    }[];
  };
}

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(WorkSchedule)
    private readonly scheduleRepo: Repository<WorkSchedule>,
    @InjectRepository(ScheduleAssignment)
    private readonly assignmentRepo: Repository<ScheduleAssignment>,
    @InjectRepository(ParkingIssue)
    private readonly parkingIssueRepo: Repository<ParkingIssue>,
    @InjectRepository(ParkingDamage)
    private readonly parkingDamageRepo: Repository<ParkingDamage>,
    @InjectRepository(CashCollection)
    private readonly cashCollectionRepo: Repository<CashCollection>,
    @InjectRepository(EditRequest)
    private readonly editRequestRepo: Repository<EditRequest>,
    @InjectRepository(HandicapRequest)
    private readonly handicapRequestRepo: Repository<HandicapRequest>,
    @InjectRepository(HandicapLegitimation)
    private readonly handicapLegitimationRepo: Repository<HandicapLegitimation>,
    @InjectRepository(RevolutionarLegitimation)
    private readonly revolutionarLegitimationRepo: Repository<RevolutionarLegitimation>,
    @InjectRepository(ShiftSwapRequest)
    private readonly shiftSwapRepo: Repository<ShiftSwapRequest>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepo: Repository<LeaveRequest>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(PvDisplayDay)
    private readonly pvDisplayDayRepo: Repository<PvDisplayDay>,
  ) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MASTER_ADMIN)
  async getDashboardStats(): Promise<DashboardStatsResponse> {
    this.logger.log('Fetching consolidated dashboard stats');

    // Use Romania timezone for today's date
    const now = new Date();
    const romaniaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
    const todayStr = romaniaTime.toISOString().split('T')[0];

    const [
      // Schedule counts by status
      schedulePending,
      scheduleApproved,
      scheduleRejected,
      scheduleDraft,

      // Today's dispatchers
      todayDispatchers,

      // Active users
      activeUsersCount,

      // Shift swaps
      shiftSwapsPendingAdmin,
      shiftSwapsTotal,

      // Leave requests
      leaveRequestsPending,
      leaveRequestsTotal,

      // Parking issues
      activeIssuesCount,
      urgentIssues,

      // Parking damages
      activeDamagesCount,
      urgentDamages,

      // Edit requests
      pendingEditRequests,

      // Cash collections today
      cashCollectionToday,

      // Handicap requests by type
      handicapAmplasare,
      handicapRevocare,
      handicapMarcaje,

      // Legitimations
      legitimationsCount,
      revolutionarCount,

      // Recent notifications (admin-targeted, last 5)
      recentNotifications,

      // PV Car status
      pvActiveDays,
    ] = await Promise.all([
      // Schedule counts
      this.scheduleRepo.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.scheduleRepo.count({ where: { status: 'APPROVED' } }),
      this.scheduleRepo.count({ where: { status: 'REJECTED' } }),
      this.scheduleRepo.count({ where: { status: 'DRAFT' } }),

      // Today's dispatchers - query assignments for today with DISP/CTRL work positions
      this.assignmentRepo
        .createQueryBuilder('assignment')
        .leftJoinAndSelect('assignment.user', 'user')
        .leftJoinAndSelect('user.department', 'department')
        .leftJoinAndSelect('assignment.shiftType', 'shiftType')
        .leftJoinAndSelect('assignment.workPosition', 'workPosition')
        .leftJoinAndSelect('assignment.schedule', 'schedule')
        .where('DATE(assignment.shift_date) = :today', { today: todayStr })
        .andWhere('schedule.status = :status', { status: 'APPROVED' })
        .andWhere('workPosition.short_name IN (:...positions)', { positions: ['DISP', 'CTRL'] })
        .orderBy('workPosition.short_name', 'ASC')
        .addOrderBy('shiftType.start_time', 'ASC')
        .getMany(),

      // Active users count
      this.userRepo.count({ where: { isActive: true } }),

      // Shift swaps
      this.shiftSwapRepo.count({ where: { status: ShiftSwapStatus.AWAITING_ADMIN } }),
      this.shiftSwapRepo.count(),

      // Leave requests
      this.leaveRequestRepo.count({ where: { status: 'PENDING' } }),
      this.leaveRequestRepo.count(),

      // Parking issues
      this.parkingIssueRepo.count({ where: { status: 'ACTIVE' } }),
      this.parkingIssueRepo.find({
        where: { status: 'ACTIVE', isUrgent: true },
        select: ['id', 'equipment', 'parkingLotId', 'createdAt'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),

      // Parking damages
      this.parkingDamageRepo.count({ where: { status: 'ACTIVE' } }),
      this.parkingDamageRepo.find({
        where: { status: 'ACTIVE', isUrgent: true },
        select: ['id', 'damagedEquipment', 'parkingLotId', 'createdAt'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),

      // Edit requests
      this.editRequestRepo.count({ where: { status: 'PENDING' } }),

      // Cash collection - all-time totals (matching original /cash-collections/totals endpoint)
      this.cashCollectionRepo
        .createQueryBuilder('cc')
        .select('COALESCE(SUM(cc.amount), 0)', 'totalAmount')
        .addSelect('COUNT(cc.id)', 'count')
        .getRawOne(),

      // Handicap requests by type (only ACTIVE)
      this.handicapRequestRepo.count({ where: { requestType: 'AMPLASARE_PANOU', status: 'ACTIVE' } }),
      this.handicapRequestRepo.count({ where: { requestType: 'REVOCARE_PANOU', status: 'ACTIVE' } }),
      this.handicapRequestRepo.count({ where: { requestType: 'CREARE_MARCAJ', status: 'ACTIVE' } }),

      // Legitimations (ACTIVE)
      this.handicapLegitimationRepo.count({ where: { status: 'ACTIVE' } }),
      this.revolutionarLegitimationRepo.count({ where: { status: 'ACTIVE' } }),

      // Recent notifications (last 5, admin-targeted)
      this.notificationRepo.find({
        select: ['id', 'type', 'title', 'message', 'createdAt', 'isRead'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),

      // PV Car status - active days today (with full details for banner)
      this.pvDisplayDayRepo
        .createQueryBuilder('day')
        .leftJoinAndSelect('day.controlUser1', 'cu1')
        .leftJoinAndSelect('day.controlUser2', 'cu2')
        .where('day.displayDate = :today', { today: todayStr })
        .andWhere('day.status IN (:...statuses)', {
          statuses: [PV_DAY_STATUS.ASSIGNED, PV_DAY_STATUS.IN_PROGRESS],
        })
        .getMany(),
    ]);

    // Format today's dispatchers
    const formattedDispatchers = todayDispatchers.map((assignment) => {
      const shiftName = assignment.shiftType?.name || '';
      let shiftCode = '';
      if (shiftName.toLowerCase().includes('zi')) {
        shiftCode = 'Z';
      } else if (shiftName.toLowerCase().includes('noapte')) {
        shiftCode = 'N';
      } else if (shiftName.toLowerCase().includes('liber')) {
        shiftCode = 'L';
      }

      return {
        id: assignment.id,
        userId: assignment.userId,
        userName: assignment.user?.fullName || 'Unknown',
        userEmail: assignment.user?.email,
        departmentName: assignment.user?.department?.name || '',
        shiftType: assignment.shiftType?.name || 'Unknown',
        shiftCode,
        startTime: assignment.shiftType?.startTime,
        endTime: assignment.shiftType?.endTime,
        workPosition: assignment.workPosition?.name || 'Dispecerat',
        workPositionCode: assignment.workPosition?.shortName || 'DISP',
      };
    });

    return {
      schedules: {
        pending: schedulePending,
        approved: scheduleApproved,
        rejected: scheduleRejected,
        draft: scheduleDraft,
      },
      todayDispatchers: formattedDispatchers,
      activeUsersCount,
      shiftSwaps: {
        pendingAdmin: shiftSwapsPendingAdmin,
        total: shiftSwapsTotal,
      },
      leaveRequests: {
        pending: leaveRequestsPending,
        total: leaveRequestsTotal,
      },
      parking: {
        activeIssues: activeIssuesCount,
        urgentIssues,
        activeDamages: activeDamagesCount,
        urgentDamages,
        pendingEditRequests,
        cashCollectionTotals: {
          totalAmount: parseFloat(cashCollectionToday?.totalAmount || '0'),
          count: parseInt(cashCollectionToday?.count || '0', 10),
        },
      },
      handicap: {
        requestsByType: {
          amplasare: handicapAmplasare,
          revocare: handicapRevocare,
          marcaje: handicapMarcaje,
        },
        legitimationsCount,
        revolutionarCount,
      },
      recentNotifications,
      carStatus: {
        carInUse: pvActiveDays.length > 0,
        activeDaysCount: pvActiveDays.length,
        days: pvActiveDays.map(d => {
          const dateStr = d.displayDate instanceof Date
            ? d.displayDate.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : String(d.displayDate);
          return {
            id: d.id,
            dayOrder: d.dayOrder,
            displayDate: dateStr,
            controlUser1Name: d.controlUser1?.fullName || null,
            controlUser2Name: d.controlUser2?.fullName || null,
            estimatedReturn: '~15:00',
          };
        }),
      },
    };
  }
}
