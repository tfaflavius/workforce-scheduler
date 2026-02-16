import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  BudgetPosition,
  Acquisition,
  AcquisitionInvoice,
  AcquisitionsSummary,
  BudgetCategory,
  CreateBudgetPositionDto,
  UpdateBudgetPositionDto,
  CreateAcquisitionDto,
  UpdateAcquisitionDto,
  CreateInvoiceDto,
  UpdateInvoiceDto,
} from '../../types/acquisitions.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const acquisitionsApi = createApi({
  reducerPath: 'acquisitionsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/acquisitions`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['BudgetPositions', 'Acquisitions', 'Invoices', 'Summary'],
  endpoints: (builder) => ({
    // ===================== BUDGET POSITIONS =====================

    getBudgetPositions: builder.query<BudgetPosition[], { year?: number; category?: BudgetCategory }>({
      query: (params) => ({
        url: '/budget-positions',
        params,
      }),
      providesTags: ['BudgetPositions'],
    }),

    getBudgetPosition: builder.query<BudgetPosition, string>({
      query: (id) => `/budget-positions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'BudgetPositions', id }],
    }),

    createBudgetPosition: builder.mutation<BudgetPosition, CreateBudgetPositionDto>({
      query: (body) => ({
        url: '/budget-positions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BudgetPositions', 'Summary'],
    }),

    updateBudgetPosition: builder.mutation<BudgetPosition, { id: string; data: UpdateBudgetPositionDto }>({
      query: ({ id, data }) => ({
        url: `/budget-positions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['BudgetPositions', 'Summary'],
    }),

    deleteBudgetPosition: builder.mutation<{ deleted: true }, string>({
      query: (id) => ({
        url: `/budget-positions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BudgetPositions', 'Summary'],
    }),

    // ===================== ACQUISITIONS =====================

    getAcquisition: builder.query<Acquisition, string>({
      query: (id) => `/acquisitions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Acquisitions', id }],
    }),

    createAcquisition: builder.mutation<Acquisition, CreateAcquisitionDto>({
      query: (body) => ({
        url: '/acquisitions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BudgetPositions', 'Acquisitions', 'Summary'],
    }),

    updateAcquisition: builder.mutation<Acquisition, { id: string; data: UpdateAcquisitionDto }>({
      query: ({ id, data }) => ({
        url: `/acquisitions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['BudgetPositions', 'Acquisitions', 'Summary'],
    }),

    deleteAcquisition: builder.mutation<{ deleted: true }, string>({
      query: (id) => ({
        url: `/acquisitions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BudgetPositions', 'Acquisitions', 'Summary'],
    }),

    // ===================== INVOICES =====================

    createInvoice: builder.mutation<AcquisitionInvoice, CreateInvoiceDto>({
      query: (body) => ({
        url: '/invoices',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BudgetPositions', 'Acquisitions', 'Invoices', 'Summary'],
    }),

    updateInvoice: builder.mutation<AcquisitionInvoice, { id: string; data: UpdateInvoiceDto }>({
      query: ({ id, data }) => ({
        url: `/invoices/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['BudgetPositions', 'Acquisitions', 'Invoices', 'Summary'],
    }),

    deleteInvoice: builder.mutation<{ deleted: true }, string>({
      query: (id) => ({
        url: `/invoices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BudgetPositions', 'Acquisitions', 'Invoices', 'Summary'],
    }),

    // ===================== SUMMARY =====================

    getSummary: builder.query<AcquisitionsSummary, { year?: number }>({
      query: (params) => ({
        url: '/summary',
        params,
      }),
      providesTags: ['Summary'],
    }),
  }),
});

export const {
  useGetBudgetPositionsQuery,
  useGetBudgetPositionQuery,
  useCreateBudgetPositionMutation,
  useUpdateBudgetPositionMutation,
  useDeleteBudgetPositionMutation,
  useGetAcquisitionQuery,
  useCreateAcquisitionMutation,
  useUpdateAcquisitionMutation,
  useDeleteAcquisitionMutation,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useGetSummaryQuery,
} = acquisitionsApi;
