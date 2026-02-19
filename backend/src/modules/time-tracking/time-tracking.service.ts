import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { LocationLog } from './entities/location-log.entity';
import { StartTimerDto } from './dto/start-timer.dto';
import { RecordLocationDto } from './dto/record-location.dto';
import { ReportGpsStatusDto } from './dto/report-gps-status.dto';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { WorkSchedule } from '../schedules/entities/work-schedule.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { GeocodingService } from './geocoding.service';

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
    private readonly pushNotificationService: PushNotificationService,
    private readonly geocodingService: GeocodingService,
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

    // Auto-geocodare async (nu blocheaza raspunsul catre angajat)
    this.geocodingService.geocodeTimeEntryLocations(savedEntry.id).catch(err => {
      this.logger.error(`Auto-geocoding failed for entry ${savedEntry.id}: ${err?.message}`);
    });

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
      // Ensure endDate includes the entire day (set to end of day)
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.andWhere('entry.start_time <= :endDate', { endDate: endOfDay });
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

    // Deduplication: skip if last log for this user is same coords within 90 seconds
    try {
      const lastLog = await this.locationLogRepository.query(
        `SELECT latitude, longitude, recorded_at FROM location_logs
         WHERE user_id = $1 AND time_entry_id = $2
         ORDER BY recorded_at DESC LIMIT 1`,
        [userId, recordLocationDto.timeEntryId],
      );
      if (lastLog.length > 0) {
        const last = lastLog[0];
        const secondsAgo = (Date.now() - new Date(last.recorded_at).getTime()) / 1000;
        const sameCoords = Math.abs(parseFloat(last.latitude) - recordLocationDto.latitude) < 0.00001
          && Math.abs(parseFloat(last.longitude) - recordLocationDto.longitude) < 0.00001;
        if (sameCoords && secondsAgo < 90) {
          // Duplicate - return existing log silently
          return last;
        }
      }
    } catch {
      // Dedup check failed - proceed with insert anyway
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

  // ===== GPS STATUS REPORTING =====

  async reportGpsStatus(userId: string, timeEntryId: string, dto: ReportGpsStatusDto): Promise<{ ok: boolean }> {
    const timeEntry = await this.timeEntryRepository.findOne({
      where: { id: timeEntryId, userId },
      relations: ['user'],
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    if (timeEntry.endTime) {
      throw new BadRequestException('Cannot report GPS status for stopped timer');
    }

    const previousStatus = timeEntry.gpsStatus;
    const statusChanged = previousStatus !== dto.status;

    // Update GPS status fields
    timeEntry.gpsStatus = dto.status;
    timeEntry.lastGpsError = dto.errorMessage || null;
    timeEntry.gpsStatusUpdatedAt = new Date();

    await this.timeEntryRepository.save(timeEntry);

    // Notify admins only when status changes to a problem state (and wasn't already that state)
    if (statusChanged && (dto.status === 'denied' || dto.status === 'error' || dto.status === 'unavailable')) {
      const employeeName = timeEntry.user?.fullName || 'Angajat necunoscut';
      const statusLabels: Record<string, string> = {
        denied: 'GPS BLOCAT - permisiune refuzata',
        error: 'Eroare GPS - locatia nu se poate determina',
        unavailable: 'GPS indisponibil pe dispozitiv',
      };

      try {
        const admins = await this.userRepository.find({
          where: [
            { role: UserRole.ADMIN, isActive: true },
            { role: UserRole.MANAGER, isActive: true },
          ],
        });

        if (admins.length > 0) {
          const notifications = admins.map(admin => ({
            userId: admin.id,
            type: NotificationType.GPS_STATUS_ALERT,
            title: 'Problema GPS angajat',
            message: `${employeeName}: ${statusLabels[dto.status] || dto.status}${dto.errorMessage ? ` - ${dto.errorMessage}` : ''}`,
            data: {
              employeeId: userId,
              employeeName,
              gpsStatus: dto.status,
              errorMessage: dto.errorMessage,
              timeEntryId,
            },
          }));

          await this.notificationsService.createMany(notifications);
          this.logger.log(`[GPS Status] Alert sent to ${admins.length} admins: ${employeeName} - ${dto.status}`);
        }
      } catch (err) {
        this.logger.error(`[GPS Status] Failed to send notifications: ${err?.message}`);
      }
    }

    return { ok: true };
  }

  // ===== ADMIN METHODS =====

  async getAdminActiveTimers(): Promise<TimeEntry[]> {
    return this.timeEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('entry.locationLogs', 'logs')
      .where('entry.end_time IS NULL')
      .andWhere('department.name IN (:...deptNames)', {
        deptNames: ['Intretinere Parcari', 'Control'],
      })
      .orderBy('entry.start_time', 'ASC')
      .addOrderBy('logs.recorded_at', 'DESC')
      .getMany();
  }

  async getAdminAllEntries(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<TimeEntry[]> {
    const query = this.timeEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('entry.locationLogs', 'logs')
      .where('department.name IN (:...deptNames)', {
        deptNames: ['Intretinere Parcari', 'Control'],
      })
      .orderBy('entry.start_time', 'DESC');

    if (filters?.startDate) {
      query.andWhere('entry.start_time >= :startDate', { startDate: filters.startDate });
    }
    if (filters?.endDate) {
      // Ensure endDate includes the entire day (set to end of day)
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.andWhere('entry.start_time <= :endDate', { endDate: endOfDay });
    }
    if (filters?.userId) {
      query.andWhere('entry.user_id = :userId', { userId: filters.userId });
    }

    return query.getMany();
  }

  async getAdminLocationLogs(timeEntryId: string): Promise<LocationLog[]> {
    const entry = await this.timeEntryRepository.findOne({
      where: { id: timeEntryId },
    });
    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }

    return this.locationLogRepository.find({
      where: { timeEntryId },
      order: { recordedAt: 'ASC' },
    });
  }

  async getAdminDepartmentUsers(): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .where('department.name IN (:...deptNames)', {
        deptNames: ['Intretinere Parcari', 'Control'],
      })
      .andWhere('user.is_active = true')
      .orderBy('user.full_name', 'ASC')
      .getMany();
  }

  async getAdminStats(): Promise<{ activeCount: number; totalHoursToday: number; locationLogsToday: number }> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Active timers count
    const activeCount = await this.timeEntryRepository
      .createQueryBuilder('entry')
      .leftJoin('entry.user', 'user')
      .leftJoin('user.department', 'department')
      .where('entry.end_time IS NULL')
      .andWhere('department.name IN (:...deptNames)', {
        deptNames: ['Intretinere Parcari', 'Control'],
      })
      .getCount();

    // Total hours today (completed entries)
    const completedToday = await this.timeEntryRepository
      .createQueryBuilder('entry')
      .leftJoin('entry.user', 'user')
      .leftJoin('user.department', 'department')
      .where('entry.start_time >= :startOfDay', { startOfDay })
      .andWhere('entry.start_time < :endOfDay', { endOfDay })
      .andWhere('entry.duration_minutes IS NOT NULL')
      .andWhere('department.name IN (:...deptNames)', {
        deptNames: ['Intretinere Parcari', 'Control'],
      })
      .select('SUM(entry.duration_minutes)', 'totalMinutes')
      .getRawOne();

    const totalHoursToday = Math.round(((completedToday?.totalMinutes || 0) / 60) * 100) / 100;

    // Location logs today
    const locationLogsToday = await this.locationLogRepository
      .createQueryBuilder('log')
      .where('log.recorded_at >= :startOfDay', { startOfDay })
      .andWhere('log.recorded_at < :endOfDay', { endOfDay })
      .getCount();

    return { activeCount, totalHoursToday, locationLogsToday };
  }

  /**
   * Returns enriched route data for a time entry with durations, distances, and street summaries.
   */
  async getAdminEntryRoute(timeEntryId: string) {
    const entry = await this.timeEntryRepository.findOne({
      where: { id: timeEntryId },
      relations: ['user', 'user.department'],
    });

    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }

    const logs = await this.locationLogRepository.find({
      where: { timeEntryId },
      order: { recordedAt: 'ASC' },
    });

    const points = logs.map((log, index) => {
      const nextLog = logs[index + 1];
      let durationMinutes = 0;
      let distanceFromPrev = 0;

      if (nextLog) {
        durationMinutes = Math.round(
          (new Date(nextLog.recordedAt).getTime() - new Date(log.recordedAt).getTime()) / 60000,
        );
      }

      if (index > 0) {
        const prevLog = logs[index - 1];
        distanceFromPrev = Math.round(
          this.geocodingService.haversineDistance(
            Number(prevLog.latitude), Number(prevLog.longitude),
            Number(log.latitude), Number(log.longitude),
          ),
        );
      }

      const recordedAtStr = log.recordedAt instanceof Date
        ? log.recordedAt.toISOString()
        : String(log.recordedAt);

      return {
        id: log.id,
        latitude: Number(log.latitude),
        longitude: Number(log.longitude),
        address: log.address || null,
        recordedAt: recordedAtStr,
        durationMinutes,
        distanceFromPrev,
        isMoving: distanceFromPrev > 100,
      };
    });

    // Street summary: group consecutive points with same address
    const streetSummary: Array<{
      streetName: string;
      firstVisitTime: string;
      lastVisitTime: string;
      totalDurationMinutes: number;
      pointCount: number;
    }> = [];

    let currentStreet: typeof streetSummary[0] | null = null;

    for (const point of points) {
      const streetName = point.address || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;

      if (currentStreet && currentStreet.streetName === streetName) {
        currentStreet.lastVisitTime = point.recordedAt;
        currentStreet.totalDurationMinutes += point.durationMinutes;
        currentStreet.pointCount++;
      } else {
        if (currentStreet) {
          streetSummary.push(currentStreet);
        }
        currentStreet = {
          streetName,
          firstVisitTime: point.recordedAt,
          lastVisitTime: point.recordedAt,
          totalDurationMinutes: point.durationMinutes,
          pointCount: 1,
        };
      }
    }
    if (currentStreet) {
      streetSummary.push(currentStreet);
    }

    const totalDistanceM = points.reduce((sum, p) => sum + p.distanceFromPrev, 0);
    const ungeocodedCount = points.filter(p => !p.address).length;

    const entryEndTime = entry.endTime || new Date();
    const totalDurationMinutes = Math.round(
      (new Date(entryEndTime).getTime() - new Date(entry.startTime).getTime()) / 60000,
    );

    const startTimeStr = entry.startTime instanceof Date
      ? entry.startTime.toISOString()
      : String(entry.startTime);
    const endTimeStr = entry.endTime
      ? (entry.endTime instanceof Date ? entry.endTime.toISOString() : String(entry.endTime))
      : null;

    return {
      timeEntryId: entry.id,
      employeeName: entry.user?.fullName || 'Necunoscut',
      department: entry.user?.department?.name || '-',
      date: new Date(startTimeStr).toISOString().split('T')[0],
      startTime: startTimeStr,
      endTime: endTimeStr,
      totalDurationMinutes,
      totalDistanceKm: Math.round((totalDistanceM / 1000) * 100) / 100,
      points,
      streetSummary,
      geocodingComplete: ungeocodedCount === 0 && points.length > 0,
      ungeocodedCount,
    };
  }

  /**
   * Returns combined route data from multiple time entries (all entries of an employee on a day).
   * Merges all location logs chronologically.
   */
  async getAdminCombinedRoute(entryIds: string[]) {
    if (!entryIds.length) {
      throw new BadRequestException('No entry IDs provided');
    }

    // Fetch all entries
    const entries = await this.timeEntryRepository.find({
      where: { id: In(entryIds) },
      relations: ['user', 'user.department'],
      order: { startTime: 'ASC' },
    });

    if (entries.length === 0) {
      throw new NotFoundException('No time entries found');
    }

    // Fetch all location logs for all entries, sorted chronologically
    const logs = await this.locationLogRepository.find({
      where: { timeEntryId: In(entryIds) },
      order: { recordedAt: 'ASC' },
    });

    // Build points with durations and distances
    const points = logs.map((log, index) => {
      const nextLog = logs[index + 1];
      let durationMinutes = 0;
      let distanceFromPrev = 0;

      if (nextLog) {
        durationMinutes = Math.round(
          (new Date(nextLog.recordedAt).getTime() - new Date(log.recordedAt).getTime()) / 60000,
        );
      }

      if (index > 0) {
        const prevLog = logs[index - 1];
        distanceFromPrev = Math.round(
          this.geocodingService.haversineDistance(
            Number(prevLog.latitude), Number(prevLog.longitude),
            Number(log.latitude), Number(log.longitude),
          ),
        );
      }

      const recordedAtStr = log.recordedAt instanceof Date
        ? log.recordedAt.toISOString()
        : String(log.recordedAt);

      return {
        id: log.id,
        latitude: Number(log.latitude),
        longitude: Number(log.longitude),
        address: log.address || null,
        recordedAt: recordedAtStr,
        durationMinutes,
        distanceFromPrev,
        isMoving: distanceFromPrev > 100,
      };
    });

    // Street summary
    const streetSummary: Array<{
      streetName: string;
      firstVisitTime: string;
      lastVisitTime: string;
      totalDurationMinutes: number;
      pointCount: number;
    }> = [];

    let currentStreet: typeof streetSummary[0] | null = null;

    for (const point of points) {
      const streetName = point.address || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;

      if (currentStreet && currentStreet.streetName === streetName) {
        currentStreet.lastVisitTime = point.recordedAt;
        currentStreet.totalDurationMinutes += point.durationMinutes;
        currentStreet.pointCount++;
      } else {
        if (currentStreet) {
          streetSummary.push(currentStreet);
        }
        currentStreet = {
          streetName,
          firstVisitTime: point.recordedAt,
          lastVisitTime: point.recordedAt,
          totalDurationMinutes: point.durationMinutes,
          pointCount: 1,
        };
      }
    }
    if (currentStreet) {
      streetSummary.push(currentStreet);
    }

    const totalDistanceM = points.reduce((sum, p) => sum + p.distanceFromPrev, 0);
    const ungeocodedCount = points.filter(p => !p.address).length;

    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];

    const firstStartTime = firstEntry.startTime instanceof Date
      ? firstEntry.startTime.toISOString()
      : String(firstEntry.startTime);
    const lastEndTime = lastEntry.endTime
      ? (lastEntry.endTime instanceof Date ? lastEntry.endTime.toISOString() : String(lastEntry.endTime))
      : null;

    const totalDurationMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);

    return {
      timeEntryId: entryIds.join(','),
      employeeName: firstEntry.user?.fullName || 'Necunoscut',
      department: firstEntry.user?.department?.name || '-',
      date: new Date(firstStartTime).toISOString().split('T')[0],
      startTime: firstStartTime,
      endTime: lastEndTime,
      totalDurationMinutes,
      totalDistanceKm: Math.round((totalDistanceM / 1000) * 100) / 100,
      points,
      streetSummary,
      geocodingComplete: ungeocodedCount === 0 && points.length > 0,
      ungeocodedCount,
      entryCount: entries.length,
    };
  }

  /**
   * Returns combined location logs from multiple time entries (for map trail view).
   */
  async getAdminCombinedLocations(entryIds: string[]): Promise<LocationLog[]> {
    if (!entryIds.length) {
      throw new BadRequestException('No entry IDs provided');
    }

    return this.locationLogRepository.find({
      where: { timeEntryId: In(entryIds) },
      order: { recordedAt: 'ASC' },
    });
  }

  /**
   * Triggers instant GPS capture by sending push notifications to all
   * active employees in Control + Intretinere Parcari departments.
   * Called on-demand by admin from the Monitorizare Pontaj page.
   */
  async triggerInstantGpsCapture(): Promise<{ notifiedCount: number; activeCount: number }> {
    try {
      // Find all active time entries for tracked departments
      const activeEntries = await this.timeEntryRepository
        .createQueryBuilder('entry')
        .leftJoinAndSelect('entry.user', 'user')
        .leftJoinAndSelect('user.department', 'department')
        .where('entry.end_time IS NULL')
        .andWhere('department.name IN (:...deptNames)', {
          deptNames: ['Intretinere Parcari', 'Control'],
        })
        .getMany();

      if (activeEntries.length === 0) {
        this.logger.log('[GPS Instant] No active employees to notify');
        return { notifiedCount: 0, activeCount: 0 };
      }

      this.logger.log(`[GPS Instant] Sending GPS capture push to ${activeEntries.length} active employees`);

      let notifiedCount = 0;

      const sendPromises = activeEntries.map(async (entry) => {
        try {
          await this.pushNotificationService.sendToUser(
            entry.userId,
            'GPS',
            'Solicitare locatie de la administrator',
            {
              action: 'GPS_CAPTURE',
              timeEntryId: entry.id,
              userId: entry.userId,
              silent: true,
            },
          );
          notifiedCount++;
        } catch (err) {
          this.logger.debug(`[GPS Instant] Failed to send push to ${entry.user?.fullName}: ${err.message}`);
        }
      });

      await Promise.all(sendPromises);
      this.logger.log(`[GPS Instant] Push notifications sent to ${notifiedCount}/${activeEntries.length} employees`);

      return { notifiedCount, activeCount: activeEntries.length };
    } catch (error) {
      this.logger.error(`[GPS Instant] Error: ${error.message}`);
      return { notifiedCount: 0, activeCount: 0 };
    }
  }
}
