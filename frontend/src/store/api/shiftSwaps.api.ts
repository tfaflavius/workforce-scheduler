import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';
import type {
  ShiftSwapRequest,
  ShiftSwapResponse,
  CreateSwapRequestDto,
  RespondSwapDto,
  AdminApproveSwapDto,
  AdminRejectSwapDto,
  UserOnDate,
  ShiftSwapStatus,
} from '../../types/shift-swap.types';

export const shiftSwapsApi = createApi({
  reducerPath: 'shiftSwapsApi',
  baseQuery: createAuthBaseQuery('/shift-swaps'),
  tagTypes: ['ShiftSwaps', 'MySwapRequests'],
  endpoints: (builder) => ({
    // Creaza cerere de schimb
    createSwapRequest: builder.mutation<ShiftSwapRequest, CreateSwapRequestDto>({
      query: (body) => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ShiftSwaps', 'MySwapRequests'],
    }),

    // Lista cererilor pentru user
    getMySwapRequests: builder.query<ShiftSwapRequest[], void>({
      query: () => '/my-requests',
      providesTags: ['MySwapRequests'],
      keepUnusedDataFor: 120, // 2 min — invalidated on create/respond/cancel
    }),

    // Lista tuturor cererilor (admin)
    getAllSwapRequests: builder.query<ShiftSwapRequest[], { status?: ShiftSwapStatus }>({
      query: (params) => ({
        url: '',
        params,
      }),
      providesTags: ['ShiftSwaps'],
    }),

    // Detalii cerere
    getSwapRequest: builder.query<ShiftSwapRequest, string>({
      query: (id) => `/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ShiftSwaps', id }],
    }),

    // Useri care lucreaza intr-o data (cu filtrare optionala pe departament/shiftPattern)
    getUsersOnDate: builder.query<UserOnDate[], { date: string; departmentId?: string; shiftPattern?: string }>({
      query: ({ date, departmentId, shiftPattern }) => {
        const params = new URLSearchParams();
        if (departmentId) params.append('departmentId', departmentId);
        if (shiftPattern) params.append('shiftPattern', shiftPattern);
        const queryStr = params.toString();
        return `/users-on-date/${date}${queryStr ? `?${queryStr}` : ''}`;
      },
    }),

    // Date disponibile pentru schimb (filtrate server-side pe departament + work position)
    getAvailableSwapDates: builder.query<{ date: string; count: number }[], string>({
      query: (date) => `/available-dates/${date}`,
    }),

    // Raspunde la cerere
    respondToSwapRequest: builder.mutation<ShiftSwapResponse, { id: string; data: RespondSwapDto }>({
      query: ({ id, data }) => ({
        url: `/${id}/respond`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ShiftSwaps', 'MySwapRequests'],
    }),

    // Admin aproba
    approveSwapRequest: builder.mutation<ShiftSwapRequest, { id: string; data: AdminApproveSwapDto }>({
      query: ({ id, data }) => ({
        url: `/${id}/approve`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ShiftSwaps', 'MySwapRequests'],
    }),

    // Admin respinge
    rejectSwapRequest: builder.mutation<ShiftSwapRequest, { id: string; data: AdminRejectSwapDto }>({
      query: ({ id, data }) => ({
        url: `/${id}/reject`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ShiftSwaps', 'MySwapRequests'],
    }),

    // Anuleaza cerere
    cancelSwapRequest: builder.mutation<ShiftSwapRequest, string>({
      query: (id) => ({
        url: `/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['ShiftSwaps', 'MySwapRequests'],
    }),

    // Admin sterge cerere complet
    deleteSwapRequest: builder.mutation<{ deleted: true }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ShiftSwaps', 'MySwapRequests'],
    }),
  }),
});

export const {
  useCreateSwapRequestMutation,
  useGetMySwapRequestsQuery,
  useGetAllSwapRequestsQuery,
  useGetSwapRequestQuery,
  useGetUsersOnDateQuery,
  useLazyGetUsersOnDateQuery,
  useGetAvailableSwapDatesQuery,
  useLazyGetAvailableSwapDatesQuery,
  useRespondToSwapRequestMutation,
  useApproveSwapRequestMutation,
  useRejectSwapRequestMutation,
  useCancelSwapRequestMutation,
  useDeleteSwapRequestMutation,
} = shiftSwapsApi;
