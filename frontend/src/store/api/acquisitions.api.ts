import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';
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
  RevenueCategory,
  RevenueSummary,
  CreateRevenueCategoryDto,
  UpdateRevenueCategoryDto,
  UpsertMonthlyRevenueDto,
} from '../../types/acquisitions.types';

export const acquisitionsApi = createApi({
  reducerPath: 'acquisitionsApi',
  baseQuery: createAuthBaseQuery('/acquisitions'),
  tagTypes: ['BudgetPositions', 'Acquisitions', 'Invoices', 'Summary', 'RevenueCategories', 'RevenueSummary'],
  keepUnusedDataFor: 300, // 5 min
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

    // ===================== REVENUE CATEGORIES =====================

    getRevenueCategories: builder.query<RevenueCategory[], void>({
      query: () => '/revenue-categories',
      providesTags: ['RevenueCategories'],
    }),

    createRevenueCategory: builder.mutation<RevenueCategory, CreateRevenueCategoryDto>({
      query: (body) => ({
        url: '/revenue-categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RevenueCategories', 'RevenueSummary'],
    }),

    updateRevenueCategory: builder.mutation<RevenueCategory, { id: string; data: UpdateRevenueCategoryDto }>({
      query: ({ id, data }) => ({
        url: `/revenue-categories/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['RevenueCategories', 'RevenueSummary'],
    }),

    deleteRevenueCategory: builder.mutation<{ deleted: true }, string>({
      query: (id) => ({
        url: `/revenue-categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RevenueCategories', 'RevenueSummary'],
    }),

    // ===================== REVENUE SUMMARY =====================

    getRevenueSummary: builder.query<RevenueSummary, { year: number }>({
      query: (params) => ({
        url: '/revenue-summary',
        params,
      }),
      providesTags: ['RevenueSummary'],
    }),

    upsertMonthlyRevenue: builder.mutation<any, UpsertMonthlyRevenueDto>({
      query: (body) => ({
        url: '/monthly-revenue',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RevenueSummary'],
    }),

    deleteMonthlyRevenue: builder.mutation<{ deleted: true }, string>({
      query: (id) => ({
        url: `/monthly-revenue/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RevenueSummary'],
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
  useGetRevenueCategoriesQuery,
  useCreateRevenueCategoryMutation,
  useUpdateRevenueCategoryMutation,
  useDeleteRevenueCategoryMutation,
  useGetRevenueSummaryQuery,
  useUpsertMonthlyRevenueMutation,
  useDeleteMonthlyRevenueMutation,
} = acquisitionsApi;
