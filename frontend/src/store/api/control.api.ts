import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';
import type {
  ControlSesizare,
  ControlSesizareComment,
  ControlSesizareType,
  ControlSesizareStatus,
  CreateControlSesizareDto,
  UpdateControlSesizareDto,
  ResolveControlSesizareDto,
  ControlSesizareReportFilters,
} from '../../types/control.types';
import type { ParkingHistory, CreateCommentDto } from '../../types/parking.types';

export const controlApi = createApi({
  reducerPath: 'controlApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['ControlSesizari', 'ControlComments', 'ControlHistory'],
  endpoints: (builder) => ({
    // Get all control sesizari
    getControlSesizari: builder.query<ControlSesizare[], { status?: ControlSesizareStatus; type?: ControlSesizareType } | void>({
      query: (params) => ({
        url: '/control-sesizari',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ControlSesizari' as const, id })),
              { type: 'ControlSesizari', id: 'LIST' },
            ]
          : [{ type: 'ControlSesizari', id: 'LIST' }],
    }),

    // Get single control sesizare
    getControlSesizare: builder.query<ControlSesizare, string>({
      query: (id) => `/control-sesizari/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ControlSesizari', id }],
    }),

    // Create control sesizare
    createControlSesizare: builder.mutation<ControlSesizare, CreateControlSesizareDto>({
      query: (body) => ({
        url: '/control-sesizari',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ControlSesizari', id: 'LIST' }],
    }),

    // Update control sesizare (Admin only)
    updateControlSesizare: builder.mutation<ControlSesizare, { id: string; data: UpdateControlSesizareDto }>({
      query: ({ id, data }) => ({
        url: `/control-sesizari/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ControlSesizari', id },
        { type: 'ControlSesizari', id: 'LIST' },
      ],
    }),

    // Resolve control sesizare
    resolveControlSesizare: builder.mutation<ControlSesizare, { id: string; data: ResolveControlSesizareDto }>({
      query: ({ id, data }) => ({
        url: `/control-sesizari/${id}/resolve`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ControlSesizari', id },
        { type: 'ControlSesizari', id: 'LIST' },
      ],
    }),

    // Delete control sesizare (Admin only)
    deleteControlSesizare: builder.mutation<void, string>({
      query: (id) => ({
        url: `/control-sesizari/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'ControlSesizari', id: 'LIST' }],
    }),

    // Get comments for a sesizare
    getControlComments: builder.query<ControlSesizareComment[], string>({
      query: (sesizareId) => `/control-sesizari/${sesizareId}/comments`,
      providesTags: (_result, _error, sesizareId) => [{ type: 'ControlComments', id: sesizareId }],
    }),

    // Add comment to a sesizare
    addControlComment: builder.mutation<ControlSesizareComment, { sesizareId: string; data: CreateCommentDto }>({
      query: ({ sesizareId, data }) => ({
        url: `/control-sesizari/${sesizareId}/comments`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { sesizareId }) => [
        { type: 'ControlComments', id: sesizareId },
        { type: 'ControlSesizari', id: sesizareId },
      ],
    }),

    // Get history for a sesizare
    getControlHistory: builder.query<ParkingHistory[], string>({
      query: (sesizareId) => `/control-sesizari/${sesizareId}/history`,
      providesTags: (_result, _error, sesizareId) => [{ type: 'ControlHistory', id: sesizareId }],
    }),

    // Get sesizari for reports
    getControlSesizariForReports: builder.query<ControlSesizare[], ControlSesizareReportFilters>({
      query: (params) => ({
        url: '/control-sesizari/reports/export',
        params,
      }),
    }),
  }),
});

export const {
  useGetControlSesizariQuery,
  useGetControlSesizareQuery,
  useCreateControlSesizareMutation,
  useUpdateControlSesizareMutation,
  useResolveControlSesizareMutation,
  useDeleteControlSesizareMutation,
  useGetControlCommentsQuery,
  useAddControlCommentMutation,
  useGetControlHistoryQuery,
  useGetControlSesizariForReportsQuery,
} = controlApi;
