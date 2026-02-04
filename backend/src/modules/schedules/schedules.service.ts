import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkSchedule } from './entities/work-schedule.entity';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';
import { ShiftType } from './entities/shift-type.entity';
import { User } from '../users/entities/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { EmailService, ScheduleEmailData } from '../../common/email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(WorkSchedule)
    private readonly scheduleRepository: Repository<WorkSchedule>,
    @InjectRepository(ScheduleAssignment)
    private readonly assignmentRepository: Repository<ScheduleAssignment>,
    @InjectRepository(ShiftType)
    private readonly shiftTypeRepository: Repository<ShiftType>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createScheduleDto: CreateScheduleDto): Promise<WorkSchedule> {
    // Parse monthYear (YYYY-MM) into separate month and year
    const [year, month] = createScheduleDto.monthYear.split('-').map(Number);

    // Generate name from month/year
    const date = new Date(year, month - 1);
    const monthName = date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
    const name = `Program ${monthName}`;

    // Determine shift pattern from first assignment (default to SHIFT_8H if no assignments)
    let shiftPattern = 'SHIFT_8H';
    if (createScheduleDto.assignments && createScheduleDto.assignments.length > 0) {
      const firstShiftType = await this.shiftTypeRepository.findOne({
        where: { id: createScheduleDto.assignments[0].shiftTypeId },
      });
      if (firstShiftType) {
        shiftPattern = firstShiftType.shiftPattern;
      }
    }

    // Create schedule
    const schedule = this.scheduleRepository.create({
      name,
      month,
      year,
      shiftPattern,
      departmentId: createScheduleDto.departmentId,
      createdBy: userId,
      status: createScheduleDto.status || 'DRAFT',
    });

    this.logger.log(`Creating schedule with status: ${schedule.status} for month: ${month}/${year}`);
    const savedSchedule = await this.scheduleRepository.save(schedule);
    this.logger.log(`Schedule created with ID: ${savedSchedule.id}, status: ${savedSchedule.status}`);

    // Create assignments
    if (createScheduleDto.assignments && createScheduleDto.assignments.length > 0) {
      const assignments = await Promise.all(
        createScheduleDto.assignments.map(async (assignmentDto) => {
          const shiftType = await this.shiftTypeRepository.findOne({
            where: { id: assignmentDto.shiftTypeId },
          });

          if (!shiftType) {
            throw new NotFoundException(`Shift type ${assignmentDto.shiftTypeId} not found`);
          }

          return this.assignmentRepository.create({
            workScheduleId: savedSchedule.id,
            userId: assignmentDto.userId,
            shiftTypeId: assignmentDto.shiftTypeId,
            shiftDate: new Date(assignmentDto.shiftDate),
            isRestDay: false,
            notes: assignmentDto.notes,
            workPositionId: assignmentDto.workPositionId || '00000000-0000-0000-0000-000000000001', // Default to Dispecerat
          });
        }),
      );

      await this.assignmentRepository.save(assignments);
    }

    const finalSchedule = await this.findOne(savedSchedule.id);

    // Get creator name
    const creator = await this.userRepository.findOne({ where: { id: userId } });
    const creatorName = creator?.fullName || 'Administrator';
    const monthYear = `${year}-${String(month).padStart(2, '0')}`;

    // Send in-app notifications to affected employees
    const userIds = [...new Set(finalSchedule.assignments.map(a => a.userId))];
    if (userIds.length > 0) {
      this.notificationsService.notifyScheduleCreated(userIds, monthYear, creatorName).catch(err => {
        this.logger.error('Failed to send schedule creation notifications:', err);
      });
    }

    // Send email notifications if schedule is approved (admin created it directly)
    if (finalSchedule.status === 'APPROVED') {
      this.sendScheduleNotifications(finalSchedule.id, 'created').catch(err => {
        this.logger.error('Failed to send schedule creation email notifications:', err);
      });
    }

    return finalSchedule;
  }

  async findAll(filters?: {
    monthYear?: string;
    status?: string;
    departmentId?: string;
    userId?: string;
    userRole?: string;
  }): Promise<WorkSchedule[]> {
    const query = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.creator', 'creator')
      .leftJoinAndSelect('schedule.department', 'department')
      .leftJoinAndSelect('schedule.approver', 'approver')
      .leftJoinAndSelect('schedule.assignments', 'assignments')
      .leftJoinAndSelect('assignments.shiftType', 'shiftType')
      .leftJoinAndSelect('assignments.workPosition', 'workPosition')
      .leftJoinAndSelect('assignments.user', 'assignmentUser')
      .orderBy('schedule.created_at', 'DESC');

    if (filters?.monthYear) {
      const [year, month] = filters.monthYear.split('-').map(Number);
      query.andWhere('schedule.year = :year AND schedule.month = :month', { year, month });
    }

    if (filters?.status) {
      query.andWhere('schedule.status = :status', { status: filters.status });
    }

    if (filters?.departmentId) {
      query.andWhere('schedule.department_id = :departmentId', { departmentId: filters.departmentId });
    }

    // Role-based filtering
    // ADMIN: sees all schedules
    // MANAGER: sees all schedules (needs to manage employees)
    // USER: only sees schedules where they have assignments
    if (filters?.userRole === 'USER' && filters?.userId) {
      // For regular users, only return schedules where they have assignments
      query.andWhere(
        'EXISTS (SELECT 1 FROM schedule_assignments sa WHERE sa.work_schedule_id = schedule.id AND sa.user_id = :userId)',
        { userId: filters.userId }
      );
    }

    const schedules = await query.getMany();

    // For regular users, filter assignments to only show their own
    if (filters?.userRole === 'USER' && filters?.userId) {
      return schedules.map(schedule => {
        schedule.assignments = schedule.assignments.filter(a => a.userId === filters.userId);
        return schedule;
      });
    }

    return schedules;
  }

  async findOne(id: string): Promise<WorkSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['creator', 'department', 'approver', 'assignments', 'assignments.user', 'assignments.shiftType', 'assignments.workPosition'],
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule ${id} not found`);
    }

    return schedule;
  }

  async update(id: string, updateScheduleDto: UpdateScheduleDto, updaterUserId?: string): Promise<WorkSchedule> {
    const schedule = await this.findOne(id);

    if (updateScheduleDto.status) {
      schedule.status = updateScheduleDto.status;
      // IMPORTANT: Save the status change immediately
      await this.scheduleRepository.save(schedule);
      this.logger.log(`Schedule ${id} status updated to: ${updateScheduleDto.status}`);
    }

    // If assignments are updated, recreate them
    if (updateScheduleDto.assignments) {
      // Delete old assignments
      await this.assignmentRepository.delete({ workScheduleId: id });

      // Create new assignments - use query builder to ensure workScheduleId is set
      for (const assignmentDto of updateScheduleDto.assignments) {
        const shiftType = await this.shiftTypeRepository.findOne({
          where: { id: assignmentDto.shiftTypeId },
        });

        if (!shiftType) {
          throw new NotFoundException(`Shift type ${assignmentDto.shiftTypeId} not found`);
        }

        await this.assignmentRepository
          .createQueryBuilder()
          .insert()
          .into('schedule_assignments')
          .values({
            workScheduleId: id,
            userId: assignmentDto.userId,
            shiftTypeId: assignmentDto.shiftTypeId,
            shiftDate: new Date(assignmentDto.shiftDate),
            isRestDay: false,
            notes: assignmentDto.notes || null,
            workPositionId: assignmentDto.workPositionId || '00000000-0000-0000-0000-000000000001', // Default to Dispecerat
          })
          .execute();
      }

      // Reload schedule to get fresh assignments without triggering cascade updates
      const updatedSchedule = await this.findOne(id);

      const monthYear = `${updatedSchedule.year}-${String(updatedSchedule.month).padStart(2, '0')}`;

      // Send in-app notifications to affected employees about the update
      const userIds = [...new Set(updatedSchedule.assignments.map(a => a.userId))];
      if (userIds.length > 0) {
        // Get the actual updater's name
        let updaterName = 'Administrator';
        if (updaterUserId) {
          const updater = await this.userRepository.findOne({ where: { id: updaterUserId } });
          updaterName = updater?.fullName || 'Administrator';
        }
        this.notificationsService.notifyScheduleUpdated(userIds, monthYear, updaterName).catch(err => {
          this.logger.error('Failed to send schedule update notifications:', err);
        });
      }

      // Send email notifications if schedule is approved (meaning changes are effective)
      if (updatedSchedule.status === 'APPROVED') {
        this.sendScheduleNotifications(updatedSchedule.id, 'updated').catch(err => {
          this.logger.error('Failed to send schedule update email notifications:', err);
        });
      }

      return updatedSchedule;
    }

    // Only save schedule if no assignments were updated
    await this.scheduleRepository.save(schedule);
    return this.findOne(id);
  }

  async approve(id: string, userId: string, notes?: string): Promise<WorkSchedule> {
    const schedule = await this.findOne(id);

    if (schedule.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Schedule is not pending approval');
    }

    // Get approver name
    const approver = await this.userRepository.findOne({ where: { id: userId } });
    const approverName = approver?.fullName || 'Admin';

    // Note: Admin can approve even with labor law violations
    // The frontend will show violations and ask for confirmation
    schedule.status = 'APPROVED';
    schedule.approvedByAdmin = userId;
    schedule.approvedAt = new Date();

    await this.scheduleRepository.save(schedule);
    const approvedSchedule = await this.findOne(id);

    const monthYear = `${approvedSchedule.year}-${String(approvedSchedule.month).padStart(2, '0')}`;

    // Send in-app notifications to affected employees
    const userIds = [...new Set(approvedSchedule.assignments.map(a => a.userId))];
    for (const affectedUserId of userIds) {
      this.notificationsService.notifyScheduleApproved(affectedUserId, monthYear, approverName).catch(err => {
        this.logger.error(`Failed to send approval notification to ${affectedUserId}:`, err);
      });
    }

    // Send email notifications to affected employees
    this.sendScheduleNotifications(approvedSchedule.id, 'approved').catch(err => {
      this.logger.error('Failed to send schedule approval notifications:', err);
    });

    return approvedSchedule;
  }

  async reject(id: string, userId: string, reason: string): Promise<WorkSchedule> {
    const schedule = await this.findOne(id);

    if (schedule.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only schedules pending approval can be rejected');
    }

    // Get rejector name
    const rejector = await this.userRepository.findOne({ where: { id: userId } });
    const rejectorName = rejector?.fullName || 'Admin';

    schedule.status = 'REJECTED';
    schedule.rejectionReason = reason;

    await this.scheduleRepository.save(schedule);
    const rejectedSchedule = await this.findOne(id);

    const monthYear = `${rejectedSchedule.year}-${String(rejectedSchedule.month).padStart(2, '0')}`;

    // Send in-app notifications to affected employees
    const userIds = [...new Set(rejectedSchedule.assignments.map(a => a.userId))];
    for (const affectedUserId of userIds) {
      this.notificationsService.notifyScheduleRejected(affectedUserId, monthYear, reason, rejectorName).catch(err => {
        this.logger.error(`Failed to send rejection notification to ${affectedUserId}:`, err);
      });
    }

    // Send email notifications to affected employees about rejection
    this.sendScheduleNotifications(rejectedSchedule.id, 'rejected', reason).catch(err => {
      this.logger.error('Failed to send schedule rejection notifications:', err);
    });

    return rejectedSchedule;
  }

  async submitForApproval(id: string): Promise<WorkSchedule> {
    const schedule = await this.findOne(id);

    if (schedule.status !== 'DRAFT') {
      throw new BadRequestException('Only draft schedules can be submitted for approval');
    }

    // Validate labor law
    const validation = await this.validateLaborLaw(id);

    if (validation.criticalViolations && validation.criticalViolations.length > 0) {
      throw new BadRequestException('Cannot submit schedule with critical labor law violations');
    }

    schedule.status = 'PENDING_APPROVAL';
    await this.scheduleRepository.save(schedule);

    return this.findOne(id);
  }

  async clone(
    sourceId: string,
    userId: string,
    targetMonth: number,
    targetYear: number,
    targetName?: string,
  ): Promise<WorkSchedule> {
    // Get the source schedule with all assignments
    const sourceSchedule = await this.scheduleRepository.findOne({
      where: { id: sourceId },
      relations: ['assignments', 'assignments.user'],
    });

    if (!sourceSchedule) {
      throw new NotFoundException('Source schedule not found');
    }

    // Validate target month and year
    if (targetMonth < 1 || targetMonth > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    if (targetYear < 2024 || targetYear > 2100) {
      throw new BadRequestException('Invalid year');
    }

    // Check if a schedule already exists for this month/year/department
    const existingSchedule = await this.scheduleRepository.findOne({
      where: {
        month: targetMonth,
        year: targetYear,
        departmentId: sourceSchedule.departmentId,
      },
    });

    if (existingSchedule) {
      throw new BadRequestException(
        `A schedule already exists for ${targetYear}-${String(targetMonth).padStart(2, '0')} in this department`,
      );
    }

    // Generate name for the new schedule
    const date = new Date(targetYear, targetMonth - 1);
    const monthName = date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
    const name = targetName || `Program ${monthName} (Cloned)`;

    // Create the new schedule
    const newSchedule = this.scheduleRepository.create({
      name,
      month: targetMonth,
      year: targetYear,
      shiftPattern: sourceSchedule.shiftPattern,
      departmentId: sourceSchedule.departmentId,
      createdBy: userId,
      status: 'DRAFT',
    });

    const savedSchedule = await this.scheduleRepository.save(newSchedule);

    // Calculate day difference between source and target months
    const sourceDate = new Date(sourceSchedule.year, sourceSchedule.month - 1, 1);
    const targetDate = new Date(targetYear, targetMonth - 1, 1);
    const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
    const daysInSourceMonth = new Date(sourceSchedule.year, sourceSchedule.month, 0).getDate();

    // Clone assignments, adjusting dates to the target month
    const newAssignments: ScheduleAssignment[] = [];
    for (const assignment of sourceSchedule.assignments) {
      const sourceShiftDate = new Date(assignment.shiftDate);
      const dayOfMonth = sourceShiftDate.getDate();

      // Only clone if the day exists in target month (e.g., Feb 31 doesn't exist)
      if (dayOfMonth <= daysInTargetMonth) {
        const targetShiftDate = new Date(targetYear, targetMonth - 1, dayOfMonth);

        const newAssignment = this.assignmentRepository.create({
          workScheduleId: savedSchedule.id,
          userId: assignment.userId,
          shiftTypeId: assignment.shiftTypeId,
          shiftDate: targetShiftDate,
          durationHours: assignment.durationHours,
          notes: assignment.notes,
          workPositionId: assignment.workPositionId || '00000000-0000-0000-0000-000000000001', // Preserve work position or default to Dispecerat
        });

        newAssignments.push(newAssignment);
      }
    }

    if (newAssignments.length > 0) {
      await this.assignmentRepository.save(newAssignments);
    }

    return this.findOne(savedSchedule.id);
  }

  async delete(id: string): Promise<void> {
    const schedule = await this.findOne(id);

    if (schedule.status === 'APPROVED' || schedule.status === 'ACTIVE') {
      throw new BadRequestException('Cannot delete approved or active schedules');
    }

    await this.assignmentRepository.delete({ workScheduleId: id });
    await this.scheduleRepository.delete(id);
  }

  async getDashboardStats(): Promise<any> {
    // Get current date info
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Count by status
    const statusCounts = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .select('schedule.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('schedule.status')
      .getRawMany();

    // Count by status for current month
    const currentMonthCounts = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .select('schedule.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('schedule.month = :month', { month: currentMonth })
      .andWhere('schedule.year = :year', { year: currentYear })
      .groupBy('schedule.status')
      .getRawMany();

    // Get pending approvals (need admin action)
    const pendingApprovals = await this.scheduleRepository.count({
      where: { status: 'PENDING_APPROVAL' },
    });

    // Get recent schedules
    const recentSchedulesRaw = await this.scheduleRepository.find({
      order: { updatedAt: 'DESC' },
      take: 5,
      relations: ['creator', 'approver'],
    });

    // Remove password from creator and approver
    const recentSchedules = recentSchedulesRaw.map(schedule => ({
      ...schedule,
      creator: schedule.creator ? {
        id: schedule.creator.id,
        email: schedule.creator.email,
        fullName: schedule.creator.fullName,
        role: schedule.creator.role,
      } : null,
      approver: schedule.approver ? {
        id: schedule.approver.id,
        email: schedule.approver.email,
        fullName: schedule.approver.fullName,
        role: schedule.approver.role,
      } : null,
    }));

    // Total employees with schedules this month
    const employeesWithSchedules = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoin('assignment.schedule', 'schedule')
      .select('COUNT(DISTINCT assignment.user_id)', 'count')
      .where('schedule.month = :month', { month: currentMonth })
      .andWhere('schedule.year = :year', { year: currentYear })
      .andWhere('schedule.status IN (:...statuses)', {
        statuses: ['APPROVED', 'ACTIVE']
      })
      .getRawOne();

    // Format status counts as object
    const statusMap = {
      DRAFT: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      ACTIVE: 0,
      REJECTED: 0,
      ARCHIVED: 0,
    };

    statusCounts.forEach((item) => {
      statusMap[item.status] = parseInt(item.count);
    });

    const currentMonthMap = {
      DRAFT: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      ACTIVE: 0,
      REJECTED: 0,
      ARCHIVED: 0,
    };

    currentMonthCounts.forEach((item) => {
      currentMonthMap[item.status] = parseInt(item.count);
    });

    return {
      overall: statusMap,
      currentMonth: currentMonthMap,
      pendingApprovals,
      recentSchedules,
      employeesWithSchedules: parseInt(employeesWithSchedules?.count || '0'),
      currentMonthYear: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
    };
  }

  async validateLaborLaw(workScheduleId: string): Promise<any> {
    const schedule = await this.findOne(workScheduleId);
    const violations = [];
    const warnings = [];

    // Group assignments by user
    const userAssignments = new Map<string, ScheduleAssignment[]>();
    schedule.assignments.forEach((assignment) => {
      if (!userAssignments.has(assignment.userId)) {
        userAssignments.set(assignment.userId, []);
      }
      userAssignments.get(assignment.userId).push(assignment);
    });

    // Validate each user's schedule
    for (const [userId, assignments] of userAssignments.entries()) {
      const userViolations = this.validateUserSchedule(assignments);
      violations.push(...userViolations.violations);
      warnings.push(...userViolations.warnings);
    }

    const criticalViolations = violations.filter((v) => v.severity === 'CRITICAL');

    return {
      isValid: criticalViolations.length === 0,
      violations,
      warnings,
      criticalViolations,
      validatedAt: new Date(),
    };
  }

  private validateUserSchedule(assignments: ScheduleAssignment[]): {
    violations: any[];
    warnings: any[];
  } {
    const violations = [];
    const warnings = [];

    // Sort assignments by date
    const sortedAssignments = assignments.sort((a, b) =>
      new Date(a.shiftDate).getTime() - new Date(b.shiftDate).getTime()
    );

    // Determine shift pattern (8h or 12h) from first assignment
    const shiftPattern = sortedAssignments[0]?.durationHours === 12 ? '12H' : '8H';

    if (shiftPattern === '12H') {
      // RULES FOR 12-HOUR SHIFTS
      // 1. After 12h day shift: minimum 24h rest
      // 2. After 12h night shift: minimum 48h rest
      for (let i = 0; i < sortedAssignments.length - 1; i++) {
        const current = sortedAssignments[i];
        const next = sortedAssignments[i + 1];

        const currentDate = new Date(current.shiftDate);
        const nextDate = new Date(next.shiftDate);

        const hoursBetween = this.calculateHoursBetweenShifts(
          currentDate,
          this.parseTime(current.endTime),
          nextDate,
          this.parseTime(next.startTime),
        );

        // Check if current shift is night shift (ends between 06:00-10:00 typically means night shift)
        const isNightShift = current.shiftType?.isNightShift || false;
        const requiredRest = isNightShift ? 48 : 24;

        if (hoursBetween < requiredRest) {
          violations.push({
            type: 'INSUFFICIENT_REST_12H',
            severity: 'CRITICAL',
            message: `Ture 12h: Odihnă insuficientă după tură ${isNightShift ? 'de noapte' : 'de zi'} (${hoursBetween.toFixed(1)}h < ${requiredRest}h necesar)`,
            legalReference: isNightShift
              ? 'Codul Muncii Art. 111: Angajații care prestează muncă de noapte au dreptul la cel puțin 48 ore de repaus între ture.'
              : 'Codul Muncii Art. 110: Durata zilnică normală a timpului de muncă este de maximum 8 ore. Pentru ture de 12h, este necesar un repaus de minimum 24h.',
            userId: current.userId,
            dates: [current.shiftDate, next.shiftDate],
            shiftType: isNightShift ? 'night' : 'day',
            requiredRest,
            actualRest: hoursBetween,
          });
        }
      }

      // 3. Check weekly hours for 12h shifts (still max 48h)
      const weeklyHours = this.calculateWeeklyHours(sortedAssignments);
      weeklyHours.forEach((hours, weekNumber) => {
        if (hours > 48) {
          violations.push({
            type: 'EXCESSIVE_WEEKLY_HOURS_12H',
            severity: 'CRITICAL',
            message: `Săptămâna ${weekNumber}: ${hours}h depășește maximul de 48h (ture 12h)`,
            legalReference: 'Codul Muncii Art. 112: Durata maximă legală a timpului de muncă nu poate depăși 48 de ore pe săptămână, inclusiv orele suplimentare.',
            userId: sortedAssignments[0].userId,
            weekNumber,
            hours,
          });
        }
      });
    } else {
      // RULES FOR 8-HOUR SHIFTS (3 shifts pattern)
      // 1. Maximum 5 days per week
      // 2. Maximum 40 hours per week
      // 3. Minimum 11h rest between shifts

      const weeklyData = this.calculateWeeklyDataFor8H(sortedAssignments);

      weeklyData.forEach((data, weekNumber) => {
        // Check max 5 days per week
        if (data.days > 5) {
          violations.push({
            type: 'EXCESSIVE_WORK_DAYS',
            severity: 'CRITICAL',
            message: `Săptămâna ${weekNumber}: ${data.days} zile de lucru depășește maximul de 5 zile (ture 8h)`,
            legalReference: 'Codul Muncii Art. 110 și Art. 113: Săptămâna de lucru este de maximum 5 zile lucrătoare. Angajații au dreptul la minimum 2 zile de repaus săptămânal.',
            userId: sortedAssignments[0].userId,
            weekNumber,
            days: data.days,
          });
        }

        // Check max 40h per week
        if (data.hours > 40) {
          violations.push({
            type: 'EXCESSIVE_WEEKLY_HOURS_8H',
            severity: 'CRITICAL',
            message: `Săptămâna ${weekNumber}: ${data.hours}h depășește maximul de 40h (ture 8h)`,
            legalReference: 'Codul Muncii Art. 110: Durata normală a timpului de muncă este de 8 ore pe zi și de 40 de ore pe săptămână.',
            userId: sortedAssignments[0].userId,
            weekNumber,
            hours: data.hours,
          });
        } else if (data.hours === 40) {
          warnings.push({
            type: 'AT_WEEKLY_LIMIT',
            severity: 'WARNING',
            message: `Săptămâna ${weekNumber}: ${data.hours}h atinge limita de 40h`,
            userId: sortedAssignments[0].userId,
            weekNumber,
            hours: data.hours,
          });
        }
      });

      // Check 11h rest between shifts for 8h pattern
      for (let i = 0; i < sortedAssignments.length - 1; i++) {
        const current = sortedAssignments[i];
        const next = sortedAssignments[i + 1];

        const hoursBetween = this.calculateHoursBetweenShifts(
          new Date(current.shiftDate),
          this.parseTime(current.endTime),
          new Date(next.shiftDate),
          this.parseTime(next.startTime),
        );

        if (hoursBetween < 11) {
          violations.push({
            type: 'INSUFFICIENT_REST_8H',
            severity: 'CRITICAL',
            message: `Ture 8h: Odihnă insuficientă între ture (${hoursBetween.toFixed(1)}h < 11h necesar)`,
            legalReference: 'Codul Muncii Art. 113: Durata minimă a repausului zilnic este de 12 ore consecutive. În cazul programului de lucru în ture, repausul între ture trebuie să fie de minimum 11 ore.',
            userId: current.userId,
            dates: [current.shiftDate, next.shiftDate],
            actualRest: hoursBetween,
          });
        }
      }
    }

    // 4. Check weekly rest (min 35 consecutive hours) - applies to both patterns
    const weeklyRestViolations = this.checkWeeklyRest(sortedAssignments);
    violations.push(...weeklyRestViolations);

    return { violations, warnings };
  }

  private parseTime(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  }

  private calculateHoursBetweenShifts(
    date1: Date,
    endTime: { hours: number; minutes: number },
    date2: Date,
    startTime: { hours: number; minutes: number },
  ): number {
    const end = new Date(date1);
    end.setHours(endTime.hours, endTime.minutes, 0, 0);

    const start = new Date(date2);
    start.setHours(startTime.hours, startTime.minutes, 0, 0);

    const diff = start.getTime() - end.getTime();
    return diff / (1000 * 60 * 60); // Convert to hours
  }

  private calculateWeeklyHours(assignments: ScheduleAssignment[]): Map<number, number> {
    const weeklyHours = new Map<number, number>();

    assignments.forEach((assignment) => {
      const date = new Date(assignment.shiftDate);
      const weekNumber = this.getWeekNumber(date);

      const currentHours = weeklyHours.get(weekNumber) || 0;
      weeklyHours.set(weekNumber, currentHours + assignment.durationHours);
    });

    return weeklyHours;
  }

  private calculateWeeklyDataFor8H(assignments: ScheduleAssignment[]): Map<number, { hours: number; days: number }> {
    const weeklyData = new Map<number, { hours: number; days: number }>();

    assignments.forEach((assignment) => {
      const date = new Date(assignment.shiftDate);
      const weekNumber = this.getWeekNumber(date);

      const current = weeklyData.get(weekNumber) || { hours: 0, days: 0 };
      weeklyData.set(weekNumber, {
        hours: current.hours + assignment.durationHours,
        days: current.days + 1,
      });
    });

    return weeklyData;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private checkWeeklyRest(assignments: ScheduleAssignment[]): any[] {
    const violations = [];

    // Group by week
    const weekGroups = new Map<number, ScheduleAssignment[]>();
    assignments.forEach((assignment) => {
      const weekNumber = this.getWeekNumber(new Date(assignment.shiftDate));
      if (!weekGroups.has(weekNumber)) {
        weekGroups.set(weekNumber, []);
      }
      weekGroups.get(weekNumber).push(assignment);
    });

    // Check each week for 35h consecutive rest
    weekGroups.forEach((weekAssignments, weekNumber) => {
      const sorted = weekAssignments.sort((a, b) =>
        new Date(a.shiftDate).getTime() - new Date(b.shiftDate).getTime()
      );

      let maxRestPeriod = 0;

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];

        const restHours = this.calculateHoursBetweenShifts(
          new Date(current.shiftDate),
          this.parseTime(current.endTime),
          new Date(next.shiftDate),
          this.parseTime(next.startTime),
        );

        maxRestPeriod = Math.max(maxRestPeriod, restHours);
      }

      if (maxRestPeriod < 35) {
        violations.push({
          type: 'INSUFFICIENT_WEEKLY_REST',
          severity: 'CRITICAL',
          message: `Week ${weekNumber}: No 35h consecutive rest period found (max ${maxRestPeriod.toFixed(1)}h)`,
          userId: sorted[0].userId,
          weekNumber,
        });
      }
    });

    return violations;
  }

  async getShiftTypes(): Promise<ShiftType[]> {
    return this.shiftTypeRepository.find({
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Send email notifications to all employees affected by a schedule
   */
  async sendScheduleNotifications(
    scheduleId: string,
    notificationType: 'created' | 'updated' | 'approved' | 'rejected',
    rejectionReason?: string,
  ): Promise<{ success: number; failed: number }> {
    try {
      const schedule = await this.findOne(scheduleId);

      // Get unique user IDs from assignments
      const userIds = [...new Set(schedule.assignments.map(a => a.userId))];

      if (userIds.length === 0) {
        this.logger.log('No employees to notify for schedule ' + scheduleId);
        return { success: 0, failed: 0 };
      }

      // Get user details (email, name)
      const users = await this.userRepository.findByIds(userIds);
      const userMap = new Map(users.map(u => [u.id, u]));

      const monthYear = `${schedule.year}-${String(schedule.month).padStart(2, '0')}`;

      // Prepare email data for each user
      const emailDataList: ScheduleEmailData[] = [];

      for (const userId of userIds) {
        const user = userMap.get(userId);
        if (!user || !user.email) {
          this.logger.warn(`User ${userId} not found or has no email`);
          continue;
        }

        // Get this user's shifts
        const userAssignments = schedule.assignments.filter(a => a.userId === userId);
        const shifts = userAssignments.map(a => ({
          date: new Date(a.shiftDate).toLocaleDateString('ro-RO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          }),
          shiftType: a.shiftType?.name || 'Tură',
          startTime: a.shiftType?.startTime || '',
          endTime: a.shiftType?.endTime || '',
          workPosition: a.workPosition?.name || 'Dispecerat',
        }));

        emailDataList.push({
          employeeEmail: user.email,
          employeeName: user.fullName || user.email,
          monthYear,
          scheduleType: notificationType,
          shifts,
          rejectionReason,
        });
      }

      // Send emails
      const result = await this.emailService.sendBulkScheduleNotifications(emailDataList);

      this.logger.log(
        `Schedule notifications sent for ${scheduleId}: ${result.success} success, ${result.failed} failed`
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to send schedule notifications: ${error.message}`);
      return { success: 0, failed: 0 };
    }
  }
}
