export interface ParkingDailyTicket {
  id: string;
  date: string;
  locationKey: string;
  ticketCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingMonthlySubscription {
  id: string;
  monthYear: string;
  locationKey: string;
  subscriptionCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingWeeklyOccupancy {
  id: string;
  weekStart: string;
  locationKey: string;
  minOccupancy: number;
  maxOccupancy: number;
  avgOccupancy: number;
  hourlyRate: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketSummary {
  locationKey: string;
  totalTickets: number;
}

export interface OccupancySummary {
  locationKey: string;
  avgMin: number;
  avgMax: number;
  avgAvg: number;
  avgHourlyRate: number;
}

export interface UpsertTicketsDto {
  date: string;
  entries: Array<{ locationKey: string; ticketCount: number }>;
}

export interface UpsertSubscriptionsDto {
  monthYear: string;
  entries: Array<{ locationKey: string; subscriptionCount: number }>;
}

export interface UpsertOccupancyDto {
  weekStart: string;
  entries: Array<{ locationKey: string; minOccupancy: number; maxOccupancy: number; avgOccupancy: number }>;
}
