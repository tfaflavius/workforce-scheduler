import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';
import type {
  PvSigningSession,
  PvSigningDay,
  PvSigningSessionComment,
  PvHistory,
  PvSessionStatus,
  CreatePvSigningSessionDto,
  UpdatePvSigningSessionDto,
  CompletePvSigningDayDto,
  AdminAssignPvSigningDayDto,
  PvUser,
} from '../../types/pv-signing.types';

export const pvSigningApi = createApi({
  reducerPath: 'pvSigningApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['PvSigningSessions', 'PvSigningDays', 'PvSigningComments', 'PvSigningHistory', 'PvMaintenanceUsers'],
  endpoints: (builder) => ({

    // ===== SESSIONS =====

    getPvSigningSessions: builder.query<PvSigningSession[], { status?: PvSessionStatus } | void>({
      query: (params) => ({
        url: '/pv-signing/sessions',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'PvSigningSessions' as const, id })),
              { type: 'PvSigningSessions', id: 'LIST' },
            ]
          : [{ type: 'PvSigningSessions', id: 'LIST' }],
    }),

    getPvSigningSession: builder.query<PvSigningSession, string>({
      query: (id) => `/pv-signing/sessions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'PvSigningSessions', id }],
    }),

    createPvSigningSession: builder.mutation<PvSigningSession, CreatePvSigningSessionDto>({
      query: (body) => ({
        url: '/pv-signing/sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'PvSigningSessions', id: 'LIST' },
        { type: 'PvSigningDays', id: 'AVAILABLE' },
      ],
    }),

    updatePvSigningSession: builder.mutation<PvSigningSession, { id: string; data: UpdatePvSigningSessionDto }>({
      query: ({ id, data }) => ({
        url: `/pv-signing/sessions/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PvSigningSessions', id },
        { type: 'PvSigningSessions', id: 'LIST' },
        { type: 'PvSigningDays', id: 'AVAILABLE' },
      ],
    }),

    deletePvSigningSession: builder.mutation<void, string>({
      query: (id) => ({
        url: `/pv-signing/sessions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'PvSigningSessions', id: 'LIST' },
        { type: 'PvSigningDays', id: 'AVAILABLE' },
      ],
    }),

    // ===== COMMENTS =====

    getPvSigningSessionComments: builder.query<PvSigningSessionComment[], string>({
      query: (sessionId) => `/pv-signing/sessions/${sessionId}/comments`,
      providesTags: (_result, _error, sessionId) => [{ type: 'PvSigningComments', id: sessionId }],
    }),

    addPvSigningSessionComment: builder.mutation<PvSigningSessionComment, { sessionId: string; content: string }>({
      query: ({ sessionId, content }) => ({
        url: `/pv-signing/sessions/${sessionId}/comments`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'PvSigningComments', id: sessionId },
        { type: 'PvSigningSessions', id: sessionId },
      ],
    }),

    // ===== HISTORY =====

    getPvSigningSessionHistory: builder.query<PvHistory[], string>({
      query: (sessionId) => `/pv-signing/sessions/${sessionId}/history`,
      providesTags: (_result, _error, sessionId) => [{ type: 'PvSigningHistory', id: `session-${sessionId}` }],
    }),

    getPvSigningDayHistory: builder.query<PvHistory[], string>({
      query: (dayId) => `/pv-signing/days/${dayId}/history`,
      providesTags: (_result, _error, dayId) => [{ type: 'PvSigningHistory', id: `day-${dayId}` }],
    }),

    // ===== DAYS / MARKETPLACE =====

    getSigningAvailableDays: builder.query<PvSigningDay[], void>({
      query: () => '/pv-signing/days/available',
      providesTags: [{ type: 'PvSigningDays', id: 'AVAILABLE' }],
    }),

    getSigningMyClaimedDays: builder.query<PvSigningDay[], void>({
      query: () => '/pv-signing/days/my-claimed',
      providesTags: [{ type: 'PvSigningDays', id: 'MY_CLAIMED' }],
    }),

    getPvSigningDay: builder.query<PvSigningDay, string>({
      query: (id) => `/pv-signing/days/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'PvSigningDays', id }],
    }),

    claimSigningDay: builder.mutation<PvSigningDay, string>({
      query: (dayId) => ({
        url: `/pv-signing/days/${dayId}/claim`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'PvSigningDays', id: 'AVAILABLE' },
        { type: 'PvSigningDays', id: 'MY_CLAIMED' },
        { type: 'PvSigningSessions', id: 'LIST' },
        { type: 'PvSigningHistory', id: 'LIST' },
      ],
    }),

    unclaimSigningDay: builder.mutation<PvSigningDay, string>({
      query: (dayId) => ({
        url: `/pv-signing/days/${dayId}/unclaim`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'PvSigningDays', id: 'AVAILABLE' },
        { type: 'PvSigningDays', id: 'MY_CLAIMED' },
        { type: 'PvSigningSessions', id: 'LIST' },
        { type: 'PvSigningHistory', id: 'LIST' },
      ],
    }),

    completeSigningDay: builder.mutation<PvSigningDay, { dayId: string; data: CompletePvSigningDayDto }>({
      query: ({ dayId, data }) => ({
        url: `/pv-signing/days/${dayId}/complete`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'PvSigningDays', id: 'MY_CLAIMED' },
        { type: 'PvSigningDays', id: 'AVAILABLE' },
        { type: 'PvSigningSessions', id: 'LIST' },
        { type: 'PvSigningHistory', id: 'LIST' },
      ],
    }),

    adminAssignSigningDay: builder.mutation<PvSigningDay, { dayId: string; data: AdminAssignPvSigningDayDto }>({
      query: ({ dayId, data }) => ({
        url: `/pv-signing/days/${dayId}/admin-assign`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'PvSigningDays', id: 'AVAILABLE' },
        { type: 'PvSigningDays', id: 'MY_CLAIMED' },
        { type: 'PvSigningSessions', id: 'LIST' },
        { type: 'PvSigningHistory', id: 'LIST' },
      ],
    }),

    // ===== MAINTENANCE USERS (Admin only) =====

    getMaintenanceUsers: builder.query<PvUser[], void>({
      query: () => '/pv-signing/maintenance-users',
      providesTags: [{ type: 'PvMaintenanceUsers', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetPvSigningSessionsQuery,
  useGetPvSigningSessionQuery,
  useCreatePvSigningSessionMutation,
  useUpdatePvSigningSessionMutation,
  useDeletePvSigningSessionMutation,
  useGetPvSigningSessionCommentsQuery,
  useAddPvSigningSessionCommentMutation,
  useGetPvSigningSessionHistoryQuery,
  useGetPvSigningDayHistoryQuery,
  useGetSigningAvailableDaysQuery,
  useGetSigningMyClaimedDaysQuery,
  useGetPvSigningDayQuery,
  useClaimSigningDayMutation,
  useUnclaimSigningDayMutation,
  useCompleteSigningDayMutation,
  useAdminAssignSigningDayMutation,
  useGetMaintenanceUsersQuery,
} = pvSigningApi;
