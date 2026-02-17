import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { LocationLog } from './entities/location-log.entity';
import { StartTimerDto } from './dto/start-timer.dto';
import { RecordLocationDto } from './dto/record-location.dto';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { WorkSchedule } from '../schedules/entities/work-schedule.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class TimeTrackingService {
  private readonly logger = new Logger(TimeTrackingService.name);

  constructor(
    @InjectRepository(TimeEntry)
    private readonly timeEntryRepository: Repository<TimeEntry>,
    @InjectRepository(LocationLog)
    private readonly locationLogRepository: Repository<LocationLog>,
    @InjectRepository(ScheduleAssignment)
    private readonly scheduleAssignmentRepository: Repository<ScheduleAssignment>,
    @InjectRepository(WorkSchedule)
    private readonly workScheduleRepository: Repository<WorkSchedule>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async startTimer(userId: string, startTimerDto: StartTimerDto): Promise<TimeEntry> {
    // Check if user already has an active timer
    const activeTimer = await this.timeEntryRepository.findOne({
      where: {
        userId,
        endTime: IsNull(),
      },
    });

    if (activeTimer) {
      throw new BadRequestException('You already have an active timer running');
    }

    const timeEntry = this.timeEntryRepository.create({
      userId,
      taskId: startTimerDto.taskId,
      startTime: new Date(),
    });

    return this.timeEntryRepository.save(timeEntry);
  }

  async stopTimer(userId: string, timeEntryId: string): Promise<any> {
    const timeEntry = await this.timeEntryRepository.findOne({
      where: { id: timeEntryId, userId },
      relations: ['task', 'user'],
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    if (timeEntry.endTime) {
      throw new BadRequestException('Timer already stopped');
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - new Date(timeEntry.startTime).getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    timeEntry.endTime = endTime;
    timeEntry.durationMinutes = durationMinutes;

    const savedEntry = await this.timeEntryRepository.save(timeEntry);

    // Verificare conformitate cu programul
    const scheduleCheck = await this.checkScheduleCompliance(userId, durationMinutes);

    return {
      ...savedEntry,
      scheduleMismatch: scheduleCheck.mismatch,
      expectedMinutes: scheduleCheck.expectedMinutes,
      actualMinutes: durationMinutes,
      expectedHours: scheduleCheck.expectedHours,
      actualHours: Math.round((durationMinutes / 60) * 100) / 100,
    };
  }

  private async checkScheduleCompliance(
    userId: string,
    actualDurationMinutes: number,
  ): Promise<{ mismatch: boolean; expectedMinutes: number; expectedHours: number }> {
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Caut schedule-urile aprobate pentru luna curenta
      const approvedSchedules = await this.workScheduleRepository.find({
        where: {
          month: today.getMonth() + 1,
          year: today.getFullYear(),
          status: 'APPROVED',
        },
      });

      if (approvedSchedules.length === 0) {
        this.logger.warn(`No approved schedules found for ${dateStr}`);
        return { mismatch: false, expectedMinutes: 0, expectedHours: 0 };
      }

      const scheduleIds = approvedSchedules.map(s => s.id);

      // Caut assignment-ul utilizatorului pentru data curenta
      const assignment = await this.scheduleAssignmentRepository
        .createQueryBuilder('sa')
        .leftJoinAndSelect('sa.shiftType', 'st')
        .where('sa.user_id = :userId', { userId })
        .andWhere('sa.shift_date = :dateStr', { dateStr })
        .andWhere('sa.work_schedule_id IN (:...scheduleIds)', { scheduleIds })
        .andWhere('sa.is_rest_day = false')
        .getOne();

      if (!assignment || !assignment.shiftType) {
        this.logger.log(`No schedule assignment found for user ${userId} on ${dateStr}`);
        return { mismatch: false, expectedMinutes: 0, expectedHours: 0 };
      }

      const expectedHours = Number(assignment.shiftType.durationHours);
      const expectedMinutes = expectedHours * 60;
      const toleranceMinutes = 15;
      const difference = Math.abs(actualDurationMinutes - expectedMinutes);
      const mismatch = difference > toleranceMinutes;

      if (mismatch) {
        this.logger.warn(
          `Schedule mismatch for user ${userId}: expected ${expectedHours}h (${expectedMinutes}min), actual ${actualDurationMinutes}min, diff ${difference}min`,
        );

        // Trimit notificari la toti adminii si managerii
        await this.notifyAdminsAboutMismatch(userId, expectedHours, actualDurationMinutes);
      }

      return { mismatch, expectedMinutes, expectedHours };
    } catch (error) {
      this.logger.error(`Error checking schedule compliance: ${error.message}`, error.stack);
      return { mismatch: false, expectedMinutes: 0, expectedHours: 0 };
    }
  }

  private async notifyAdminsAboutMismatch(
    userId: string,
    expectedHours: number,
    actualMinutes: number,
  ): Promise<void> {
    try {
      // Gasesc numele utilizatorului
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const userName = user?.fullName || 'Utilizator necunoscut';

      const actualHours = Math.round((actualMinutes / 60) * 100) / 100;

      // Gasesc toti adminii si managerii activi
      const adminsAndManagers = await this.userRepository.find({
        where: [
          { role: UserRole.ADMIN, isActive: true },
          { role: UserRole.MANAGER, isActive: true },
        ],
      });

      if (adminsAndManagers.length === 0) {
        this.logger.warn('No active admins/managers found for mismatch notification');
        return;
      }

      const notifications = adminsAndManagers.map(admin => ({
        userId: admin.id,
        type: NotificationType.TIME_ENTRY_MISMATCH,
        title: 'Nepotrivire ore pontaj',
        message: `${userName} a lucrat ${actualHours}h, dar programul prevedea ${expectedHours}h.`,
        data: {
          employeeId: userId,
          employeeName: userName,
          expectedHours,
          actualHours,
          actualMinutes,
        },
      }));

      await this.notificationsService.createMany(notifications);
      this.logger.log(`Sent mismatch notifications to ${adminsAndManagers.length} admins/managers`);
    } catch (error) {
      this.logger.error(`Error sending mismatch notifications: ${error.message}`, error.stack);
    }
  }

  async getActiveTimer(userId: string): Promise<TimeEntry | null> {
    return this.timeEntryRepository.findOne({
      where: {
        userId,
        endTime: IsNull(),
      },
      relations: ['task', 'locationLogs'],
    });
  }

  async getTimeEntries(userId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    taskId?: string;
  }): Promise<TimeEntry[]> {
    const query = this.timeEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.task', 'task')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('entry.locationLogs', 'logs')
      .where('entry.user_id = :userId', { userId })
      .orderBy('entry.start_time', 'DESC');

    if (filters?.startDate) {
      query.andWhere('entry.start_time >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('entry.start_time <= :endDate', { endDate: filters.endDate });
    }

    if (filters?.taskId) {
      query.andWhere('entry.task_id = :taskId', { taskId: filters.taskId });
    }

    return query.getMany();
  }

  async recordLocation(userId: string, recordLocationDto: RecordLocationDto): Promise<LocationLog> {
    const timeEntry = await this.timeEntryRepository.findOne({
      where: { id: recordLocationDto.timeEntryId, userId },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    if (timeEntry.endTime) {
      throw new BadRequestException('Cannot record location for stopped timer');
    }

    // Try insert with PostGIS geography, fall back to simple insert
    try {
      const result = await this.locationLogRepository.query(
        `INSERT INTO location_logs
         (time_entry_id, user_id, latitude, longitude, accuracy, recorded_at, is_auto_recorded, location)
         VALUES ($1, $2, $3::numeric, $4::numeric, $5::numeric, $6, $7, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography)
         RETURNING *`,
        [
          recordLocationDto.timeEntryId,
          userId,
          recordLocationDto.latitude,
          recordLocationDto.longitude,
          recordLocationDto.accuracy || null,
          new Date(),
          recordLocationDto.isAutoRecorded ?? true,
        ],
      );
      return result[0];
    } catch {
      // PostGIS not available - insert without geography column
      const locationLog = this.locationLogRepository.create({
        timeEntryId: recordLocationDto.timeEntryId,
        userId,
        latitude: recordLocationDto.latitude,
        longitude: recordLocationDto.longitude,
        accuracy: recordLocationDto.accuracy || null,
        recordedAt: new Date(),
        isAutoRecorded: recordLocationDto.isAutoRecorded ?? true,
      });
      return this.locationLogRepository.save(locationLog);
    }
  }

  async getLocationHistory(userId: string, timeEntryId: string): Promise<LocationLog[]> {
    const timeEntry = await this.timeEntryRepository.findOne({
      where: { id: timeEntryId, userId },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    return this.locationLogRepository.find({
      where: { timeEntryId },
      order: { recordedAt: 'ASC' },
    });
  }
}
