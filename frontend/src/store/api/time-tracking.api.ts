import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  TimeEntry,
  LocationLog,
  StartTimerRequest,
  StopTimerResponse,
  RecordLocationRequest,
  GetTimeEntriesFilters,
  AdminActiveTimer,
  AdminTimeEntry,
  AdminTimeTrackingStats,
  AdminTimeEntriesFilters,
  AdminDepartmentUser,
  RouteData,
  ReportGpsStatusRequest,
} from '../../types/time-tracking.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const timeTrackingApi = createApi({
  reducerPath: 'timeTrackingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['TimeEntry', 'ActiveTimer', 'LocationLog', 'AdminActiveTimer', 'AdminTimeEntry', 'AdminStats', 'AdminUsers', 'RouteData'],
  endpoints: (builder) => ({
    startTimer: builder.mutation<TimeEntry, StartTimerRequest | void>({
      query: (body = {}) => ({
        url: '/time-tracking/start',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ActiveTimer', 'TimeEntry'],
    }),

    stopTimer: builder.mutation<StopTimerResponse, string>({
      query: (id) => ({
        url: `/time-tracking/${id}/stop`,
        method: 'POST',
      }),
      invalidatesTags: ['ActiveTimer', 'TimeEntry'],
    }),

    getActiveTimer: builder.query<TimeEntry | null, void>({
      query: () => '/time-tracking/active',
      providesTags: ['ActiveTimer'],
    }),

    getTimeEntries: builder.query<TimeEntry[], GetTimeEntriesFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.taskId) params.append('taskId', filters.taskId);

        return `/time-tracking/entries?${params.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'TimeEntry' as const, id })),
              { type: 'TimeEntry', id: 'LIST' },
            ]
          : [{ type: 'TimeEntry', id: 'LIST' }],
    }),

    recordLocation: builder.mutation<LocationLog, RecordLocationRequest>({
      query: (body) => ({
        url: '/time-tracking/location',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'LocationLog', id: arg.timeEntryId },
        'LocationLog',
      ],
    }),

    reportGpsStatus: builder.mutation<{ ok: boolean }, { timeEntryId: string } & ReportGpsStatusRequest>({
      query: ({ timeEntryId, ...body }) => ({
        url: `/time-tracking/${timeEntryId}/gps-status`,
        method: 'POST',
        body,
      }),
    }),

    getLocationHistory: builder.query<LocationLog[], string>({
      query: (timeEntryId) => `/time-tracking/${timeEntryId}/locations`,
      providesTags: (result, _error, timeEntryId) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'LocationLog' as const, id })),
              { type: 'LocationLog', id: timeEntryId },
            ]
          : [{ type: 'LocationLog', id: timeEntryId }],
    }),

    // ===== ADMIN ENDPOINTS =====

    getAdminActiveTimers: builder.query<AdminActiveTimer[], void>({
      query: () => '/time-tracking/admin/active',
      providesTags: ['AdminActiveTimer'],
    }),

    getAdminTimeEntries: builder.query<AdminTimeEntry[], AdminTimeEntriesFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.userId) params.append('userId', filters.userId);
        return `/time-tracking/admin/entries?${params.toString()}`;
      },
      providesTags: ['AdminTimeEntry'],
    }),

    getAdminEntryLocations: builder.query<LocationLog[], string>({
      query: (timeEntryId) => `/time-tracking/admin/entries/${timeEntryId}/locations`,
      providesTags: (_result, _error, timeEntryId) => [
        { type: 'LocationLog', id: `admin-${timeEntryId}` },
      ],
    }),

    getAdminDepartmentUsers: builder.query<AdminDepartmentUser[], void>({
      query: () => '/time-tracking/admin/users',
      providesTags: ['AdminUsers'],
    }),

    getAdminTimeTrackingStats: builder.query<AdminTimeTrackingStats, void>({
      query: () => '/time-tracking/admin/stats',
      providesTags: ['AdminStats'],
    }),

    requestInstantLocations: builder.mutation<{ notifiedCount: number; activeCount: number }, void>({
      query: () => ({
        url: '/time-tracking/admin/request-locations',
        method: 'POST',
      }),
    }),

    getAdminEntryRoute: builder.query<RouteData, string>({
      query: (timeEntryId) => `/time-tracking/admin/entries/${timeEntryId}/route`,
      providesTags: (_result, _error, timeEntryId) => [
        { type: 'RouteData' as const, id: timeEntryId },
      ],
    }),

    geocodeEntryLocations: builder.mutation<{ geocodedCount: number }, string>({
      query: (timeEntryId) => ({
        url: `/time-tracking/admin/entries/${timeEntryId}/geocode`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, timeEntryId) => [
        { type: 'RouteData' as const, id: timeEntryId },
        { type: 'LocationLog', id: `admin-${timeEntryId}` },
      ],
    }),

    getAdminCombinedRoute: builder.query<RouteData, string[]>({
      query: (entryIds) => `/time-tracking/admin/combined-route?entryIds=${entryIds.join(',')}`,
      providesTags: (_result, _error, entryIds) => [
        { type: 'RouteData' as const, id: `combined-${entryIds.join(',')}` },
      ],
    }),

    getAdminCombinedLocations: builder.query<LocationLog[], string[]>({
      query: (entryIds) => `/time-tracking/admin/combined-locations?entryIds=${entryIds.join(',')}`,
      providesTags: (_result, _error, entryIds) => [
        { type: 'LocationLog', id: `combined-${entryIds.join(',')}` },
      ],
    }),
  }),
});

export const {
  useStartTimerMutation,
  useStopTimerMutation,
  useGetActiveTimerQuery,
  useGetTimeEntriesQuery,
  useRecordLocationMutation,
  useReportGpsStatusMutation,
  useGetLocationHistoryQuery,
  // Admin hooks
  useGetAdminActiveTimersQuery,
  useGetAdminTimeEntriesQuery,
  useGetAdminEntryLocationsQuery,
  useGetAdminDepartmentUsersQuery,
  useGetAdminTimeTrackingStatsQuery,
  useRequestInstantLocationsMutation,
  useGetAdminEntryRouteQuery,
  useGeocodeEntryLocationsMutation,
  useGetAdminCombinedRouteQuery,
  useGetAdminCombinedLocationsQuery,
} = timeTrackingApi;
