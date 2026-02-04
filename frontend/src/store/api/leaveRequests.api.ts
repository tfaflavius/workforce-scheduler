import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  LeaveRequest,
  LeaveBalance,
  CreateLeaveRequestDto,
  RespondLeaveRequestDto,
  UpdateLeaveBalanceDto,
  LeaveRequestStatus,
} from '../../types/leave-request.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const leaveRequestsApi = createApi({
  reducerPath: 'leaveRequestsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/leave-requests`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['LeaveRequests', 'MyLeaveRequests', 'LeaveBalance'],
  endpoints: (builder) => ({
    // Crează cerere de concediu
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

    // Balanța mea de zile
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

    // Verifică suprapuneri (admin)
    checkOverlaps: builder.query<LeaveRequest[], string>({
      query: (id) => `/${id}/overlaps`,
    }),

    // Balanța unui user (admin)
    getUserBalance: builder.query<LeaveBalance[], { userId: string; year?: number }>({
      query: ({ userId, year }) => ({
        url: `/user/${userId}/balance`,
        params: year ? { year } : undefined,
      }),
    }),

    // Actualizează balanța unui user (admin)
    updateUserBalance: builder.mutation<LeaveBalance, { userId: string; data: UpdateLeaveBalanceDto; year?: number }>({
      query: ({ userId, data, year }) => ({
        url: `/user/${userId}/balance`,
        method: 'PATCH',
        body: data,
        params: year ? { year } : undefined,
      }),
      invalidatesTags: ['LeaveBalance'],
    }),

    // Răspunde la cerere (admin)
    respondToLeaveRequest: builder.mutation<LeaveRequest, { id: string; data: RespondLeaveRequestDto }>({
      query: ({ id, data }) => ({
        url: `/${id}/respond`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['LeaveRequests', 'MyLeaveRequests', 'LeaveBalance'],
    }),

    // Anulează cerere
    cancelLeaveRequest: builder.mutation<void, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['LeaveRequests', 'MyLeaveRequests'],
    }),

    // Concedii aprobate pe lună (pentru pre-populare în programare)
    getApprovedLeavesByMonth: builder.query<{ userId: string; dates: string[]; leaveType: string }[], string>({
      query: (monthYear) => ({
        url: '/approved-by-month',
        params: { monthYear },
      }),
      providesTags: ['LeaveRequests'],
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
} = leaveRequestsApi;
