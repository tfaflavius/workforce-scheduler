import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { LocationLog } from './entities/location-log.entity';
import { StartTimerDto } from './dto/start-timer.dto';
import { RecordLocationDto } from './dto/record-location.dto';

@Injectable()
export class TimeTrackingService {
  constructor(
    @InjectRepository(TimeEntry)
    private readonly timeEntryRepository: Repository<TimeEntry>,
    @InjectRepository(LocationLog)
    private readonly locationLogRepository: Repository<LocationLog>,
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

  async stopTimer(userId: string, timeEntryId: string): Promise<TimeEntry> {
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

    return this.timeEntryRepository.save(timeEntry);
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

    // Use raw query to insert with PostGIS geography
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
