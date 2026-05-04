import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';
import type {
  DomiciliuRequest,
  DomiciliuRequestComment,
  DomiciliuRequestType,
  DomiciliuRequestStatus,
  CreateDomiciliuRequestDto,
  UpdateDomiciliuRequestDto,
  ResolveDomiciliuRequestDto,
  DomiciliuReportFilters,
} from '../../types/domiciliu.types';
import type { ParkingHistory, CreateCommentDto } from '../../types/parking.types';

export const domiciliuApi = createApi({
  reducerPath: 'domiciliuApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['DomiciliuRequests', 'DomiciliuComments', 'DomiciliuHistory'],
  keepUnusedDataFor: 180, // 3 min
  endpoints: (builder) => ({
    // Get all domiciliu requests
    getDomiciliuRequests: builder.query<DomiciliuRequest[], { status?: DomiciliuRequestStatus; type?: DomiciliuRequestType } | void>({
      query: (params) => ({
        url: '/parking/domiciliu-requests',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DomiciliuRequests' as const, id })),
              { type: 'DomiciliuRequests', id: 'LIST' },
            ]
          : [{ type: 'DomiciliuRequests', id: 'LIST' }],
    }),

    // Get single domiciliu request
    getDomiciliuRequest: builder.query<DomiciliuRequest, string>({
      query: (id) => `/parking/domiciliu-requests/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'DomiciliuRequests', id }],
    }),

    // Create domiciliu request
    createDomiciliuRequest: builder.mutation<DomiciliuRequest, CreateDomiciliuRequestDto>({
      query: (body) => ({
        url: '/parking/domiciliu-requests',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'DomiciliuRequests', id: 'LIST' }],
    }),

    // Update domiciliu request (Admin only)
    updateDomiciliuRequest: builder.mutation<DomiciliuRequest, { id: string; data: UpdateDomiciliuRequestDto }>({
      query: ({ id, data }) => ({
        url: `/parking/domiciliu-requests/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'DomiciliuRequests', id },
        { type: 'DomiciliuRequests', id: 'LIST' },
      ],
    }),

    // Resolve domiciliu request
    resolveDomiciliuRequest: builder.mutation<DomiciliuRequest, { id: string; data: ResolveDomiciliuRequestDto }>({
      query: ({ id, data }) => ({
        url: `/parking/domiciliu-requests/${id}/resolve`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'DomiciliuRequests', id },
        { type: 'DomiciliuRequests', id: 'LIST' },
      ],
    }),

    // Delete domiciliu request (Admin only)
    deleteDomiciliuRequest: builder.mutation<void, string>({
      query: (id) => ({
        url: `/parking/domiciliu-requests/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'DomiciliuRequests', id: 'LIST' }],
    }),

    // Get comments for a request
    getDomiciliuComments: builder.query<DomiciliuRequestComment[], string>({
      query: (requestId) => `/parking/domiciliu-requests/${requestId}/comments`,
      providesTags: (_result, _error, requestId) => [{ type: 'DomiciliuComments', id: requestId }],
    }),

    // Add comment to a request
    addDomiciliuComment: builder.mutation<DomiciliuRequestComment, { requestId: string; data: CreateCommentDto }>({
      query: ({ requestId, data }) => ({
        url: `/parking/domiciliu-requests/${requestId}/comments`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { requestId }) => [
        { type: 'DomiciliuComments', id: requestId },
        { type: 'DomiciliuRequests', id: requestId },
      ],
    }),

    // Get history for a request
    getDomiciliuHistory: builder.query<ParkingHistory[], string>({
      query: (requestId) => `/parking/domiciliu-requests/${requestId}/history`,
      providesTags: (_result, _error, requestId) => [{ type: 'DomiciliuHistory', id: requestId }],
    }),

    // Get requests for reports
    getDomiciliuRequestsForReports: builder.query<DomiciliuRequest[], DomiciliuReportFilters>({
      query: (params) => ({
        url: '/parking/domiciliu-requests/reports/export',
        params,
      }),
    }),
  }),
});

export const {
  useGetDomiciliuRequestsQuery,
  useGetDomiciliuRequestQuery,
  useCreateDomiciliuRequestMutation,
  useUpdateDomiciliuRequestMutation,
  useResolveDomiciliuRequestMutation,
  useDeleteDomiciliuRequestMutation,
  useGetDomiciliuCommentsQuery,
  useAddDomiciliuCommentMutation,
  useGetDomiciliuHistoryQuery,
  useGetDomiciliuRequestsForReportsQuery,
} = domiciliuApi;
