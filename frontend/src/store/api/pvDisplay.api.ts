import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  PvDisplaySession,
  PvDisplayDay,
  PvDisplaySessionComment,
  PvHistory,
  PvSessionStatus,
  CreatePvDisplaySessionDto,
  UpdatePvDisplaySessionDto,
  CompletePvDisplayDayDto,
  AdminAssignPvDayDto,
  PvUser,
} from '../../types/pv-display.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const pvDisplayApi = createApi({
  reducerPath: 'pvDisplayApi',
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
  tagTypes: ['PvSessions', 'PvDays', 'PvComments', 'PvHistory', 'PvControlUsers'],
  endpoints: (builder) => ({

    // ===== SESSIONS =====

    getPvSessions: builder.query<PvDisplaySession[], { status?: PvSessionStatus } | void>({
      query: (params) => ({
        url: '/pv-display/sessions',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'PvSessions' as const, id })),
              { type: 'PvSessions', id: 'LIST' },
            ]
          : [{ type: 'PvSessions', id: 'LIST' }],
    }),

    getPvSession: builder.query<PvDisplaySession, string>({
      query: (id) => `/pv-display/sessions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'PvSessions', id }],
    }),

    createPvSession: builder.mutation<PvDisplaySession, CreatePvDisplaySessionDto>({
      query: (body) => ({
        url: '/pv-display/sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'PvSessions', id: 'LIST' },
        { type: 'PvDays', id: 'AVAILABLE' },
      ],
    }),

    updatePvSession: builder.mutation<PvDisplaySession, { id: string; data: UpdatePvDisplaySessionDto }>({
      query: ({ id, data }) => ({
        url: `/pv-display/sessions/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PvSessions', id },
        { type: 'PvSessions', id: 'LIST' },
        { type: 'PvDays', id: 'AVAILABLE' },
      ],
    }),

    deletePvSession: builder.mutation<void, string>({
      query: (id) => ({
        url: `/pv-display/sessions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'PvSessions', id: 'LIST' },
        { type: 'PvDays', id: 'AVAILABLE' },
      ],
    }),

    // ===== COMMENTS =====

    getPvSessionComments: builder.query<PvDisplaySessionComment[], string>({
      query: (sessionId) => `/pv-display/sessions/${sessionId}/comments`,
      providesTags: (_result, _error, sessionId) => [{ type: 'PvComments', id: sessionId }],
    }),

    addPvSessionComment: builder.mutation<PvDisplaySessionComment, { sessionId: string; content: string }>({
      query: ({ sessionId, content }) => ({
        url: `/pv-display/sessions/${sessionId}/comments`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'PvComments', id: sessionId },
        { type: 'PvSessions', id: sessionId },
      ],
    }),

    // ===== HISTORY =====

    getPvSessionHistory: builder.query<PvHistory[], string>({
      query: (sessionId) => `/pv-display/sessions/${sessionId}/history`,
      providesTags: (_result, _error, sessionId) => [{ type: 'PvHistory', id: `session-${sessionId}` }],
    }),

    getPvDayHistory: builder.query<PvHistory[], string>({
      query: (dayId) => `/pv-display/days/${dayId}/history`,
      providesTags: (_result, _error, dayId) => [{ type: 'PvHistory', id: `day-${dayId}` }],
    }),

    // ===== DAYS / MARKETPLACE =====

    getAvailableDays: builder.query<PvDisplayDay[], void>({
      query: () => '/pv-display/days/available',
      providesTags: [{ type: 'PvDays', id: 'AVAILABLE' }],
    }),

    getMyClaimedDays: builder.query<PvDisplayDay[], void>({
      query: () => '/pv-display/days/my-claimed',
      providesTags: [{ type: 'PvDays', id: 'MY_CLAIMED' }],
    }),

    getPvDay: builder.query<PvDisplayDay, string>({
      query: (id) => `/pv-display/days/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'PvDays', id }],
    }),

    claimDay: builder.mutation<PvDisplayDay, string>({
      query: (dayId) => ({
        url: `/pv-display/days/${dayId}/claim`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'PvDays', id: 'AVAILABLE' },
        { type: 'PvDays', id: 'MY_CLAIMED' },
        { type: 'PvSessions', id: 'LIST' },
      ],
    }),

    unclaimDay: builder.mutation<PvDisplayDay, string>({
      query: (dayId) => ({
        url: `/pv-display/days/${dayId}/unclaim`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'PvDays', id: 'AVAILABLE' },
        { type: 'PvDays', id: 'MY_CLAIMED' },
        { type: 'PvSessions', id: 'LIST' },
      ],
    }),

    completeDay: builder.mutation<PvDisplayDay, { dayId: string; data: CompletePvDisplayDayDto }>({
      query: ({ dayId, data }) => ({
        url: `/pv-display/days/${dayId}/complete`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'PvDays', id: 'MY_CLAIMED' },
        { type: 'PvDays', id: 'AVAILABLE' },
        { type: 'PvSessions', id: 'LIST' },
      ],
    }),

    adminAssignDay: builder.mutation<PvDisplayDay, { dayId: string; data: AdminAssignPvDayDto }>({
      query: ({ dayId, data }) => ({
        url: `/pv-display/days/${dayId}/admin-assign`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'PvDays', id: 'AVAILABLE' },
        { type: 'PvDays', id: 'MY_CLAIMED' },
        { type: 'PvSessions', id: 'LIST' },
      ],
    }),

    // ===== CONTROL USERS (Admin only) =====

    getControlUsers: builder.query<PvUser[], void>({
      query: () => '/pv-display/control-users',
      providesTags: [{ type: 'PvControlUsers', id: 'LIST' }],
    }),

    // ===== CAR STATUS (all authenticated users) =====

    getCarStatusToday: builder.query<{
      carInUse: boolean;
      days: {
        id: string;
        dayOrder: number;
        displayDate: string;
        controlUser1Name: string | null;
        controlUser2Name: string | null;
        estimatedReturn: string;
      }[];
    }, void>({
      query: () => '/pv-car-status/today',
    }),
  }),
});

export const {
  useGetPvSessionsQuery,
  useGetPvSessionQuery,
  useCreatePvSessionMutation,
  useUpdatePvSessionMutation,
  useDeletePvSessionMutation,
  useGetPvSessionCommentsQuery,
  useAddPvSessionCommentMutation,
  useGetPvSessionHistoryQuery,
  useGetPvDayHistoryQuery,
  useGetAvailableDaysQuery,
  useGetMyClaimedDaysQuery,
  useGetPvDayQuery,
  useClaimDayMutation,
  useUnclaimDayMutation,
  useCompleteDayMutation,
  useAdminAssignDayMutation,
  useGetControlUsersQuery,
  useGetCarStatusTodayQuery,
} = pvDisplayApi;
