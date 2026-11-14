import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export type ScheduleTimeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ScheduleTimeRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  reason: string | null;
  status: ScheduleTimeRequestStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; department?: { id: string; name: string } | null } | null;
  reviewer?: { id: string; fullName: string } | null;
}

export interface ScheduleTimeEligibility {
  eligible: boolean;
  defaultStart: string | null;
  defaultInterval: string | null;
  options: Array<{ start: string; label: string }>;
}

/** Cereri de a veni la alta ora (tot 8 ore) — angajatii cu program fix automat. */
export const scheduleTimeRequestsApi = createApi({
  reducerPath: 'scheduleTimeRequestsApi',
  baseQuery: createAuthBaseQuery('/schedule-time-requests'),
  tagTypes: ['TimeRequests', 'MyTimeRequests'],
  endpoints: (builder) => ({
    getTimeEligibility: builder.query<ScheduleTimeEligibility, void>({
      query: () => '/eligibility',
    }),
    getMyTimeRequests: builder.query<ScheduleTimeRequest[], void>({
      query: () => '/my',
      providesTags: ['MyTimeRequests'],
    }),
    getTimeRequests: builder.query<ScheduleTimeRequest[], { status?: string } | void>({
      query: (p) => ({ url: '', params: p && p.status ? { status: p.status } : undefined }),
      providesTags: ['TimeRequests'],
    }),
    createTimeRequest: builder.mutation<
      ScheduleTimeRequest,
      { startDate: string; endDate: string; startTime: string; reason?: string }
    >({
      query: (body) => ({ url: '', method: 'POST', body }),
      invalidatesTags: ['MyTimeRequests', 'TimeRequests'],
    }),
    cancelTimeRequest: builder.mutation<ScheduleTimeRequest, string>({
      query: (id) => ({ url: `/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MyTimeRequests', 'TimeRequests'],
    }),
    respondTimeRequest: builder.mutation<
      ScheduleTimeRequest & { applied?: { updated: number; created: number; skipped: number } | null },
      { id: string; status: 'APPROVED' | 'REJECTED'; note?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/${id}/respond`, method: 'PATCH', body }),
      invalidatesTags: ['MyTimeRequests', 'TimeRequests'],
    }),
  }),
});

export const {
  useGetTimeEligibilityQuery,
  useGetMyTimeRequestsQuery,
  useGetTimeRequestsQuery,
  useCreateTimeRequestMutation,
  useCancelTimeRequestMutation,
  useRespondTimeRequestMutation,
} = scheduleTimeRequestsApi;
