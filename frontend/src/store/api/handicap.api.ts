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
  HandicapLegitimation,
  HandicapLegitimationComment,
  HandicapLegitimationStatus,
  CreateHandicapLegitimationDto,
  UpdateHandicapLegitimationDto,
  ResolveHandicapLegitimationDto,
  HandicapLegitimationReportFilters,
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
  tagTypes: ['HandicapRequests', 'HandicapComments', 'HandicapHistory', 'HandicapLegitimations', 'HandicapLegitimationComments', 'HandicapLegitimationHistory'],
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

    // ============== LEGITIMAȚII HANDICAP ==============

    // Get all handicap legitimations
    getHandicapLegitimations: builder.query<HandicapLegitimation[], { status?: HandicapLegitimationStatus } | void>({
      query: (params) => ({
        url: '/parking/handicap-legitimations',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'HandicapLegitimations' as const, id })),
              { type: 'HandicapLegitimations', id: 'LIST' },
            ]
          : [{ type: 'HandicapLegitimations', id: 'LIST' }],
    }),

    // Get single handicap legitimation
    getHandicapLegitimation: builder.query<HandicapLegitimation, string>({
      query: (id) => `/parking/handicap-legitimations/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'HandicapLegitimations', id }],
    }),

    // Create handicap legitimation
    createHandicapLegitimation: builder.mutation<HandicapLegitimation, CreateHandicapLegitimationDto>({
      query: (body) => ({
        url: '/parking/handicap-legitimations',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'HandicapLegitimations', id: 'LIST' }],
    }),

    // Update handicap legitimation (Admin only)
    updateHandicapLegitimation: builder.mutation<HandicapLegitimation, { id: string; data: UpdateHandicapLegitimationDto }>({
      query: ({ id, data }) => ({
        url: `/parking/handicap-legitimations/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'HandicapLegitimations', id },
        { type: 'HandicapLegitimations', id: 'LIST' },
      ],
    }),

    // Resolve handicap legitimation
    resolveHandicapLegitimation: builder.mutation<HandicapLegitimation, { id: string; data: ResolveHandicapLegitimationDto }>({
      query: ({ id, data }) => ({
        url: `/parking/handicap-legitimations/${id}/resolve`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'HandicapLegitimations', id },
        { type: 'HandicapLegitimations', id: 'LIST' },
      ],
    }),

    // Delete handicap legitimation (Admin only)
    deleteHandicapLegitimation: builder.mutation<void, string>({
      query: (id) => ({
        url: `/parking/handicap-legitimations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'HandicapLegitimations', id: 'LIST' }],
    }),

    // Get comments for a legitimation
    getHandicapLegitimationComments: builder.query<HandicapLegitimationComment[], string>({
      query: (legitimationId) => `/parking/handicap-legitimations/${legitimationId}/comments`,
      providesTags: (_result, _error, legitimationId) => [{ type: 'HandicapLegitimationComments', id: legitimationId }],
    }),

    // Add comment to a legitimation
    addHandicapLegitimationComment: builder.mutation<HandicapLegitimationComment, { legitimationId: string; data: CreateCommentDto }>({
      query: ({ legitimationId, data }) => ({
        url: `/parking/handicap-legitimations/${legitimationId}/comments`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { legitimationId }) => [
        { type: 'HandicapLegitimationComments', id: legitimationId },
        { type: 'HandicapLegitimations', id: legitimationId },
      ],
    }),

    // Get history for a legitimation
    getHandicapLegitimationHistory: builder.query<ParkingHistory[], string>({
      query: (legitimationId) => `/parking/handicap-legitimations/${legitimationId}/history`,
      providesTags: (_result, _error, legitimationId) => [{ type: 'HandicapLegitimationHistory', id: legitimationId }],
    }),

    // Get legitimations for reports
    getHandicapLegitimationsForReports: builder.query<HandicapLegitimation[], HandicapLegitimationReportFilters>({
      query: (params) => ({
        url: '/parking/handicap-legitimations/reports',
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
  // Legitimații
  useGetHandicapLegitimationsQuery,
  useGetHandicapLegitimationQuery,
  useCreateHandicapLegitimationMutation,
  useUpdateHandicapLegitimationMutation,
  useResolveHandicapLegitimationMutation,
  useDeleteHandicapLegitimationMutation,
  useGetHandicapLegitimationCommentsQuery,
  useAddHandicapLegitimationCommentMutation,
  useGetHandicapLegitimationHistoryQuery,
  useGetHandicapLegitimationsForReportsQuery,
} = handicapApi;
