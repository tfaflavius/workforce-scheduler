import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  HandicapRequest,
  HandicapRequestComment,
  HandicapRequestType,
  HandicapRequestStatus,
  CreateHandicapRequestDto,
  UpdateHandicapRequestDto,
  ResolveHandicapRequestDto,
  HandicapReportFilters,
} from '../../types/handicap.types';
import type { ParkingHistory, CreateCommentDto } from '../../types/parking.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const handicapApi = createApi({
  reducerPath: 'handicapApi',
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
  tagTypes: ['HandicapRequests', 'HandicapComments', 'HandicapHistory'],
  endpoints: (builder) => ({
    // Get all handicap requests
    getHandicapRequests: builder.query<HandicapRequest[], { status?: HandicapRequestStatus; type?: HandicapRequestType } | void>({
      query: (params) => ({
        url: '/handicap-requests',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'HandicapRequests' as const, id })),
              { type: 'HandicapRequests', id: 'LIST' },
            ]
          : [{ type: 'HandicapRequests', id: 'LIST' }],
    }),

    // Get single handicap request
    getHandicapRequest: builder.query<HandicapRequest, string>({
      query: (id) => `/handicap-requests/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'HandicapRequests', id }],
    }),

    // Create handicap request
    createHandicapRequest: builder.mutation<HandicapRequest, CreateHandicapRequestDto>({
      query: (body) => ({
        url: '/handicap-requests',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'HandicapRequests', id: 'LIST' }],
    }),

    // Update handicap request (Admin only)
    updateHandicapRequest: builder.mutation<HandicapRequest, { id: string; data: UpdateHandicapRequestDto }>({
      query: ({ id, data }) => ({
        url: `/handicap-requests/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'HandicapRequests', id },
        { type: 'HandicapRequests', id: 'LIST' },
      ],
    }),

    // Resolve handicap request
    resolveHandicapRequest: builder.mutation<HandicapRequest, { id: string; data: ResolveHandicapRequestDto }>({
      query: ({ id, data }) => ({
        url: `/handicap-requests/${id}/resolve`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'HandicapRequests', id },
        { type: 'HandicapRequests', id: 'LIST' },
      ],
    }),

    // Delete handicap request (Admin only)
    deleteHandicapRequest: builder.mutation<void, string>({
      query: (id) => ({
        url: `/handicap-requests/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'HandicapRequests', id: 'LIST' }],
    }),

    // Get comments for a request
    getHandicapComments: builder.query<HandicapRequestComment[], string>({
      query: (requestId) => `/handicap-requests/${requestId}/comments`,
      providesTags: (_result, _error, requestId) => [{ type: 'HandicapComments', id: requestId }],
    }),

    // Add comment to a request
    addHandicapComment: builder.mutation<HandicapRequestComment, { requestId: string; data: CreateCommentDto }>({
      query: ({ requestId, data }) => ({
        url: `/handicap-requests/${requestId}/comments`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { requestId }) => [
        { type: 'HandicapComments', id: requestId },
        { type: 'HandicapRequests', id: requestId },
      ],
    }),

    // Get history for a request
    getHandicapHistory: builder.query<ParkingHistory[], string>({
      query: (requestId) => `/handicap-requests/${requestId}/history`,
      providesTags: (_result, _error, requestId) => [{ type: 'HandicapHistory', id: requestId }],
    }),

    // Get requests for reports
    getHandicapRequestsForReports: builder.query<HandicapRequest[], HandicapReportFilters>({
      query: (params) => ({
        url: '/handicap-requests/reports/export',
        params,
      }),
    }),
  }),
});

export const {
  useGetHandicapRequestsQuery,
  useGetHandicapRequestQuery,
  useCreateHandicapRequestMutation,
  useUpdateHandicapRequestMutation,
  useResolveHandicapRequestMutation,
  useDeleteHandicapRequestMutation,
  useGetHandicapCommentsQuery,
  useAddHandicapCommentMutation,
  useGetHandicapHistoryQuery,
  useGetHandicapRequestsForReportsQuery,
} = handicapApi;
