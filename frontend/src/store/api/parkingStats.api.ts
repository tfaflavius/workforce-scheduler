import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const parkingStatsApi = createApi({
  reducerPath: 'parkingStatsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
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
