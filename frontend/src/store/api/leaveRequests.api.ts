import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';
import type {
  LeaveRequest,
  LeaveBalance,
  CreateLeaveRequestDto,
  RespondLeaveRequestDto,
  UpdateLeaveBalanceDto,
  AdminEditLeaveRequestDto,
  LeaveRequestStatus,
} from '../../types/leave-request.types';

export const leaveRequestsApi = createApi({
  reducerPath: 'leaveRequestsApi',
  baseQuery: createAuthBaseQuery('/leave-requests'),
  tagTypes: ['LeaveRequests', 'MyLeaveRequests', 'LeaveBalance'],
  endpoints: (builder) => ({
    // Creaza cerere de concediu
    createLeaveRequest: builder.mutation<LeaveRequest, CreateLeaveRequestDto>({
      query: (body) => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['LeaveRequests', 'MyLeaveRequests', 'LeaveBalance'],
    }),

    // Lista cererilor mele
    getMyLeaveRequests: builder.query<LeaveRequest[], void>({
      query: () => '/my-requests',
      providesTags: ['MyLeaveRequests'],
    }),

    // Balanta mea de zile
    getMyLeaveBalance: builder.query<LeaveBalance[], number | void>({
      query: (year) => ({
        url: '/my-balance',
        params: year ? { year } : undefined,
      }),
      providesTags: ['LeaveBalance'],
    }),

    // Toate cererile (admin)
    getAllLeaveRequests: builder.query<LeaveRequest[], { status?: LeaveRequestStatus } | void>({
      query: (params) => ({
        url: '',
        params: params || undefined,
      }),
      providesTags: ['LeaveRequests'],
    }),

    // Detalii cerere
    getLeaveRequest: builder.query<LeaveRequest, string>({
      query: (id) => `/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'LeaveRequests', id }],
    }),

    // Verifica suprapuneri (admin)
    checkOverlaps: builder.query<LeaveRequest[], string>({
      query: (id) => `/${id}/overlaps`,
    }),

    // Balanta unui user (admin)
    getUserBalance: builder.query<LeaveBalance[], { userId: string; year?: number }>({
      query: ({ userId, year }) => ({
        url: `/user/${userId}/balance`,
        params: year ? { year } : undefined,
      }),
    }),

    // Actualizeaza balanta unui user (admin)
    updateUserBalance: builder.mutation<LeaveBalance, { userId: string; data: UpdateLeaveBalanceDto; year?: number }>({
      query: ({ userId, data, year }) => ({
        url: `/user/${userId}/balance`,
        method: 'PATCH',
        body: data,
        params: year ? { year } : undefined,
      }),
      invalidatesTags: ['LeaveBalance'],
    }),

    // Raspunde la cerere (admin)
    respondToLeaveRequest: builder.mutation<LeaveRequest, { id: string; data: RespondLeaveRequestDto }>({
      query: ({ id, data }) => ({
        url: `/${id}/respond`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['LeaveRequests', 'MyLeaveRequests', 'LeaveBalance'],
    }),

    // Anuleaza cerere
    cancelLeaveRequest: builder.mutation<void, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['LeaveRequests', 'MyLeaveRequests'],
    }),

    // Concedii aprobate pe luna (pentru pre-populare in programare)
    getApprovedLeavesByMonth: builder.query<{ userId: string; dates: string[]; leaveType: string }[], string>({
      query: (monthYear) => ({
        url: '/approved-by-month',
        params: { monthYear },
      }),
      providesTags: ['LeaveRequests'],
    }),

    // Admin edit cerere (inclusiv aprobate)
    adminEditLeaveRequest: builder.mutation<LeaveRequest, { id: string; data: AdminEditLeaveRequestDto }>({
      query: ({ id, data }) => ({
        url: `/${id}/admin-edit`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['LeaveRequests', 'MyLeaveRequests', 'LeaveBalance'],
    }),

    // Admin delete cerere (inclusiv aprobate)
    adminDeleteLeaveRequest: builder.mutation<void, string>({
      query: (id) => ({
        url: `/${id}/admin-delete`,
        method: 'DELETE',
      }),
      invalidatesTags: ['LeaveRequests', 'MyLeaveRequests', 'LeaveBalance'],
    }),
  }),
});

export const {
  useCreateLeaveRequestMutation,
  useGetMyLeaveRequestsQuery,
  useGetMyLeaveBalanceQuery,
  useGetAllLeaveRequestsQuery,
  useGetLeaveRequestQuery,
  useLazyCheckOverlapsQuery,
  useGetUserBalanceQuery,
  useUpdateUserBalanceMutation,
  useRespondToLeaveRequestMutation,
  useCancelLeaveRequestMutation,
  useGetApprovedLeavesByMonthQuery,
  useAdminEditLeaveRequestMutation,
  useAdminDeleteLeaveRequestMutation,
} = leaveRequestsApi;
