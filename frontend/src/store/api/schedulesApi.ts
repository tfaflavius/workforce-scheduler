import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  WorkSchedule,
  ShiftType,
  WorkPosition,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  ApproveScheduleRequest,
  RejectScheduleRequest,
  CloneScheduleRequest,
  ExportScheduleRequest,
  ReportResponse,
  ScheduleFilters,
  LaborLawValidation,
} from '../../types/schedule.types';
import type { RootState } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Type for today's dispatcher
export interface TodayDispatcher {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  shiftType: string;
  shiftCode: string;
  startTime: string;
  endTime: string;
  workPosition: string;
  workPositionCode: string;
}

export const schedulesApi = createApi({
  reducerPath: 'schedulesApi',
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
  tagTypes: ['Schedule', 'ShiftType', 'WorkPosition'],
  endpoints: (builder) => ({
    // Get all shift types
    getShiftTypes: builder.query<ShiftType[], void>({
      query: () => '/schedules/shift-types',
      providesTags: ['ShiftType'],
    }),

    // Get all work positions
    getWorkPositions: builder.query<WorkPosition[], void>({
      query: () => '/work-positions',
      providesTags: ['WorkPosition'],
    }),

    // Get all schedules with optional filters
    getSchedules: builder.query<WorkSchedule[], ScheduleFilters>({
      query: (filters) => ({
        url: '/schedules',
        params: filters,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Schedule' as const, id })),
              { type: 'Schedule', id: 'LIST' },
            ]
          : [{ type: 'Schedule', id: 'LIST' }],
    }),

    // Get single schedule by ID
    getSchedule: builder.query<WorkSchedule, string>({
      query: (id) => `/schedules/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Schedule', id }],
    }),

    // Create new schedule
    createSchedule: builder.mutation<WorkSchedule, CreateScheduleRequest>({
      query: (body) => ({
        url: '/schedules',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Schedule', id: 'LIST' }],
    }),

    // Update schedule
    updateSchedule: builder.mutation<
      WorkSchedule,
      { id: string; data: UpdateScheduleRequest }
    >({
      query: ({ id, data }) => ({
        url: `/schedules/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Schedule', id },
        { type: 'Schedule', id: 'LIST' },
      ],
    }),

    // Delete schedule
    deleteSchedule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/schedules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Schedule', id: 'LIST' }],
    }),

    // Validate labor law compliance
    validateSchedule: builder.query<LaborLawValidation, string>({
      query: (id) => `/schedules/${id}/validate`,
    }),

    // Submit schedule for approval
    submitSchedule: builder.mutation<WorkSchedule, string>({
      query: (id) => ({
        url: `/schedules/${id}/submit`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Schedule', id },
        { type: 'Schedule', id: 'LIST' },
      ],
    }),

    // Approve schedule (Admin only)
    approveSchedule: builder.mutation<
      WorkSchedule,
      { id: string; data?: ApproveScheduleRequest }
    >({
      query: ({ id, data }) => ({
        url: `/schedules/${id}/approve`,
        method: 'POST',
        body: data || {},
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Schedule', id },
        { type: 'Schedule', id: 'LIST' },
      ],
    }),

    // Reject schedule (Admin only)
    rejectSchedule: builder.mutation<
      WorkSchedule,
      { id: string; data: RejectScheduleRequest }
    >({
      query: ({ id, data }) => ({
        url: `/schedules/${id}/reject`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Schedule', id },
        { type: 'Schedule', id: 'LIST' },
      ],
    }),

    // Clone schedule to another month
    cloneSchedule: builder.mutation<
      WorkSchedule,
      { id: string; data: CloneScheduleRequest }
    >({
      query: ({ id, data }) => ({
        url: `/schedules/${id}/clone`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Schedule', id: 'LIST' }],
    }),

    // Get dashboard stats
    getDashboardStats: builder.query<any, void>({
      query: () => '/schedules/stats/dashboard',
      providesTags: ['Schedule'],
    }),

    // Get today's dispatcher assignments
    getTodayDispatchers: builder.query<TodayDispatcher[], void>({
      query: () => '/schedules/today/dispatchers',
      providesTags: ['Schedule'],
    }),

    // Export schedule to PDF or Excel
    exportSchedule: builder.mutation<
      ReportResponse,
      { id: string; request: ExportScheduleRequest }
    >({
      query: ({ id, request }) => ({
        url: `/reports/schedules/${id}/export`,
        method: 'POST',
        params: { format: request.format },
        body: {
          includeViolations: request.includeViolations ?? true,
          includeWeeklySummaries: request.includeWeeklySummaries ?? true,
          language: request.language ?? 'ro',
        },
      }),
    }),
  }),
});

export const {
  useGetShiftTypesQuery,
  useGetWorkPositionsQuery,
  useGetSchedulesQuery,
  useGetScheduleQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useValidateScheduleQuery,
  useLazyValidateScheduleQuery,
  useSubmitScheduleMutation,
  useApproveScheduleMutation,
  useRejectScheduleMutation,
  useCloneScheduleMutation,
  useGetDashboardStatsQuery,
  useGetTodayDispatchersQuery,
  useExportScheduleMutation,
} = schedulesApi;
