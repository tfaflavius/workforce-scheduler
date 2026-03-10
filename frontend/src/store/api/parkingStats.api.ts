import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';
import type {
  ParkingDailyTicket,
  ParkingMonthlySubscription,
  ParkingWeeklyOccupancy,
  TicketSummary,
  OccupancySummary,
  UpsertTicketsDto,
  UpsertSubscriptionsDto,
  UpsertOccupancyDto,
} from '../../types/parking-stats.types';

export const parkingStatsApi = createApi({
  reducerPath: 'parkingStatsApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['DailyTickets', 'MonthlySubscriptions', 'WeeklyOccupancy'],
  endpoints: (builder) => ({

    // ===== DAILY TICKETS =====

    getDailyTickets: builder.query<ParkingDailyTicket[], string>({
      query: (date) => `/parking-stats/tickets?date=${date}`,
      providesTags: ['DailyTickets'],
    }),

    getWeeklyTicketsSummary: builder.query<TicketSummary[], string>({
      query: (weekStart) => `/parking-stats/tickets/weekly?weekStart=${weekStart}`,
      providesTags: ['DailyTickets'],
    }),

    getMonthlyTicketsSummary: builder.query<TicketSummary[], string>({
      query: (monthYear) => `/parking-stats/tickets/monthly?monthYear=${monthYear}`,
      providesTags: ['DailyTickets'],
    }),

    upsertDailyTickets: builder.mutation<ParkingDailyTicket[], UpsertTicketsDto>({
      query: (body) => ({
        url: '/parking-stats/tickets',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['DailyTickets'],
    }),

    // ===== MONTHLY SUBSCRIPTIONS =====

    getMonthlySubscriptions: builder.query<ParkingMonthlySubscription[], string>({
      query: (monthYear) => `/parking-stats/subscriptions?monthYear=${monthYear}`,
      providesTags: ['MonthlySubscriptions'],
    }),

    upsertMonthlySubscriptions: builder.mutation<ParkingMonthlySubscription[], UpsertSubscriptionsDto>({
      query: (body) => ({
        url: '/parking-stats/subscriptions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MonthlySubscriptions'],
    }),

    // ===== WEEKLY OCCUPANCY =====

    getWeeklyOccupancy: builder.query<ParkingWeeklyOccupancy[], string>({
      query: (weekStart) => `/parking-stats/occupancy?weekStart=${weekStart}`,
      providesTags: ['WeeklyOccupancy'],
    }),

    getMonthlyOccupancySummary: builder.query<OccupancySummary[], string>({
      query: (monthYear) => `/parking-stats/occupancy/monthly?monthYear=${monthYear}`,
      providesTags: ['WeeklyOccupancy'],
    }),

    upsertWeeklyOccupancy: builder.mutation<ParkingWeeklyOccupancy[], UpsertOccupancyDto>({
      query: (body) => ({
        url: '/parking-stats/occupancy',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WeeklyOccupancy'],
    }),
  }),
});

export const {
  useGetDailyTicketsQuery,
  useGetWeeklyTicketsSummaryQuery,
  useGetMonthlyTicketsSummaryQuery,
  useUpsertDailyTicketsMutation,
  useGetMonthlySubscriptionsQuery,
  useUpsertMonthlySubscriptionsMutation,
  useGetWeeklyOccupancyQuery,
  useGetMonthlyOccupancySummaryQuery,
  useUpsertWeeklyOccupancyMutation,
} = parkingStatsApi;
