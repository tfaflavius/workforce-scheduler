import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingDailyTicket } from './entities/parking-daily-ticket.entity';
import { ParkingMonthlySubscription } from './entities/parking-monthly-subscription.entity';
import { ParkingWeeklyOccupancy } from './entities/parking-weekly-occupancy.entity';
import { PARKING_STAT_LOCATIONS, PARKING_SUBSCRIPTION_LOCATIONS } from './constants/parking.constants';

interface TicketEntry {
  locationKey: string;
  ticketCount: number;
}

interface SubscriptionEntry {
  locationKey: string;
  subscriptionCount: number;
}

interface OccupancyEntry {
  locationKey: string;
  minOccupancy: number;
  maxOccupancy: number;
  avgOccupancy: number;
}

@Injectable()
export class ParkingStatsService {
  private readonly logger = new Logger(ParkingStatsService.name);

  constructor(
    @InjectRepository(ParkingDailyTicket)
    private readonly ticketRepository: Repository<ParkingDailyTicket>,
    @InjectRepository(ParkingMonthlySubscription)
    private readonly subscriptionRepository: Repository<ParkingMonthlySubscription>,
    @InjectRepository(ParkingWeeklyOccupancy)
    private readonly occupancyRepository: Repository<ParkingWeeklyOccupancy>,
  ) {}

  // ==================== DAILY TICKETS ====================

  async upsertDailyTickets(date: string, entries: TicketEntry[], userId: string): Promise<ParkingDailyTicket[]> {
    const results: ParkingDailyTicket[] = [];

    for (const entry of entries) {
      // Validate locationKey
      if (!PARKING_STAT_LOCATIONS.find(l => l.key === entry.locationKey)) continue;

      const existing = await this.ticketRepository.findOne({
        where: { date, locationKey: entry.locationKey },
      });

      if (existing) {
        existing.ticketCount = entry.ticketCount;
        results.push(await this.ticketRepository.save(existing));
      } else {
        const ticket = this.ticketRepository.create({
          date,
          locationKey: entry.locationKey,
          ticketCount: entry.ticketCount,
          createdBy: userId,
        });
        results.push(await this.ticketRepository.save(ticket));
      }
    }

    return results;
  }

  async getDailyTickets(date: string): Promise<ParkingDailyTicket[]> {
    return this.ticketRepository.find({
      where: { date },
      order: { locationKey: 'ASC' },
    });
  }

  async getWeeklyTicketsSummary(weekStart: string): Promise<{ locationKey: string; totalTickets: number }[]> {
    // weekStart is a Monday date (YYYY-MM-DD)
    const weekEnd = this.addDays(weekStart, 6);

    const result = await this.ticketRepository
      .createQueryBuilder('t')
      .select('t.location_key', 'locationKey')
      .addSelect('COALESCE(SUM(t.ticket_count), 0)', 'totalTickets')
      .where('t.date >= :weekStart AND t.date <= :weekEnd', { weekStart, weekEnd })
      .groupBy('t.location_key')
      .orderBy('t.location_key', 'ASC')
      .getRawMany();

    return result.map(r => ({
      locationKey: r.locationKey,
      totalTickets: Number(r.totalTickets),
    }));
  }

  async getMonthlyTicketsSummary(monthYear: string): Promise<{ locationKey: string; totalTickets: number }[]> {
    // monthYear format: "2026-01"
    const [year, month] = monthYear.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]; // Last day of month

    const result = await this.ticketRepository
      .createQueryBuilder('t')
      .select('t.location_key', 'locationKey')
      .addSelect('COALESCE(SUM(t.ticket_count), 0)', 'totalTickets')
      .where('t.date >= :startDate AND t.date <= :endDate', { startDate, endDate })
      .groupBy('t.location_key')
      .orderBy('t.location_key', 'ASC')
      .getRawMany();

    return result.map(r => ({
      locationKey: r.locationKey,
      totalTickets: Number(r.totalTickets),
    }));
  }

  // ==================== MONTHLY SUBSCRIPTIONS ====================

  async upsertMonthlySubscriptions(monthYear: string, entries: SubscriptionEntry[], userId: string): Promise<ParkingMonthlySubscription[]> {
    const results: ParkingMonthlySubscription[] = [];

    for (const entry of entries) {
      if (!PARKING_SUBSCRIPTION_LOCATIONS.find(l => l.key === entry.locationKey)) continue;

      const existing = await this.subscriptionRepository.findOne({
        where: { monthYear, locationKey: entry.locationKey },
      });

      if (existing) {
        existing.subscriptionCount = entry.subscriptionCount;
        results.push(await this.subscriptionRepository.save(existing));
      } else {
        const sub = this.subscriptionRepository.create({
          monthYear,
          locationKey: entry.locationKey,
          subscriptionCount: entry.subscriptionCount,
          createdBy: userId,
        });
        results.push(await this.subscriptionRepository.save(sub));
      }
    }

    return results;
  }

  async getMonthlySubscriptions(monthYear: string): Promise<ParkingMonthlySubscription[]> {
    return this.subscriptionRepository.find({
      where: { monthYear },
      order: { locationKey: 'ASC' },
    });
  }

  // ==================== WEEKLY OCCUPANCY ====================

  async upsertWeeklyOccupancy(weekStart: string, entries: OccupancyEntry[], userId: string): Promise<ParkingWeeklyOccupancy[]> {
    const results: ParkingWeeklyOccupancy[] = [];

    for (const entry of entries) {
      if (!PARKING_STAT_LOCATIONS.find(l => l.key === entry.locationKey)) continue;

      const hourlyRate = Number((entry.avgOccupancy / 168).toFixed(4));

      const existing = await this.occupancyRepository.findOne({
        where: { weekStart, locationKey: entry.locationKey },
      });

      if (existing) {
        existing.minOccupancy = entry.minOccupancy;
        existing.maxOccupancy = entry.maxOccupancy;
        existing.avgOccupancy = entry.avgOccupancy;
        existing.hourlyRate = hourlyRate;
        results.push(await this.occupancyRepository.save(existing));
      } else {
        const occ = this.occupancyRepository.create({
          weekStart,
          locationKey: entry.locationKey,
          minOccupancy: entry.minOccupancy,
          maxOccupancy: entry.maxOccupancy,
          avgOccupancy: entry.avgOccupancy,
          hourlyRate,
          createdBy: userId,
        });
        results.push(await this.occupancyRepository.save(occ));
      }
    }

    return results;
  }

  async getWeeklyOccupancy(weekStart: string): Promise<ParkingWeeklyOccupancy[]> {
    return this.occupancyRepository.find({
      where: { weekStart },
      order: { locationKey: 'ASC' },
    });
  }

  async getMonthlyOccupancySummary(monthYear: string): Promise<{ locationKey: string; avgMin: number; avgMax: number; avgAvg: number; avgHourlyRate: number }[]> {
    const [year, month] = monthYear.split('-');
    // Get all Mondays in this month
    const firstDay = new Date(Number(year), Number(month) - 1, 1);
    const lastDay = new Date(Number(year), Number(month), 0);
    const firstMonday = this.getFirstMondayOfMonth(firstDay);
    const lastMonday = this.getLastMondayOfMonth(lastDay);

    const result = await this.occupancyRepository
      .createQueryBuilder('o')
      .select('o.location_key', 'locationKey')
      .addSelect('COALESCE(AVG(o.min_occupancy), 0)', 'avgMin')
      .addSelect('COALESCE(AVG(o.max_occupancy), 0)', 'avgMax')
      .addSelect('COALESCE(AVG(o.avg_occupancy), 0)', 'avgAvg')
      .addSelect('COALESCE(AVG(o.hourly_rate), 0)', 'avgHourlyRate')
      .where('o.week_start >= :firstMonday AND o.week_start <= :lastMonday', {
        firstMonday: firstMonday.toISOString().split('T')[0],
        lastMonday: lastMonday.toISOString().split('T')[0],
      })
      .groupBy('o.location_key')
      .orderBy('o.location_key', 'ASC')
      .getRawMany();

    return result.map(r => ({
      locationKey: r.locationKey,
      avgMin: Number(Number(r.avgMin).toFixed(0)),
      avgMax: Number(Number(r.avgMax).toFixed(0)),
      avgAvg: Number(Number(r.avgAvg).toFixed(2)),
      avgHourlyRate: Number(Number(r.avgHourlyRate).toFixed(4)),
    }));
  }

  // ==================== HELPERS ====================

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  private getFirstMondayOfMonth(date: Date): Date {
    const d = new Date(date);
    while (d.getDay() !== 1) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  private getLastMondayOfMonth(date: Date): Date {
    const d = new Date(date);
    while (d.getDay() !== 1) {
      d.setDate(d.getDate() - 1);
    }
    return d;
  }
}
