import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  TimeEntry,
  LocationLog,
  StartTimerRequest,
  RecordLocationRequest,
  GetTimeEntriesFilters,
} from '../../types/time-tracking.types';

const API_URL = 'http://localhost:3000/api';

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
  tagTypes: ['TimeEntry', 'ActiveTimer', 'LocationLog'],
  endpoints: (builder) => ({
    startTimer: builder.mutation<TimeEntry, StartTimerRequest | void>({
      query: (body = {}) => ({
        url: '/time-tracking/start',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ActiveTimer', 'TimeEntry'],
    }),

    stopTimer: builder.mutation<TimeEntry, string>({
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
  }),
});

export const {
  useStartTimerMutation,
  useStopTimerMutation,
  useGetActiveTimerQuery,
  useGetTimeEntriesQuery,
  useRecordLocationMutation,
  useGetLocationHistoryQuery,
} = timeTrackingApi;
