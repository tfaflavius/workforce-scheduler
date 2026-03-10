import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';
import type {
  DailyReport,
  CreateDailyReportDto,
  UpdateDailyReportDto,
  AdminCommentDto,
  MissingReportsByDate,
} from '../../types/daily-report.types';

export const dailyReportsApi = createApi({
  reducerPath: 'dailyReportsApi',
  baseQuery: createAuthBaseQuery('/daily-reports'),
  tagTypes: ['DailyReports', 'MyDailyReports', 'TodayReport', 'MissingReports'],
  endpoints: (builder) => ({
    // Creaza sau actualizeaza raportul zilnic
    createDailyReport: builder.mutation<DailyReport, CreateDailyReportDto>({
      query: (body) => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['DailyReports', 'MyDailyReports', 'TodayReport'],
    }),

    // Raportul de azi al userului curent
    getTodayReport: builder.query<DailyReport | null, void>({
      query: () => '/today',
      providesTags: ['TodayReport'],
    }),

    // Rapoartele mele (cu filtre de data)
    getMyDailyReports: builder.query<DailyReport[], { startDate?: string; endDate?: string } | void>({
      query: (params) => ({
        url: '/my-reports',
        params: params || undefined,
      }),
      providesTags: ['MyDailyReports'],
    }),

    // Toate rapoartele (admin/manager) cu filtre
    getAllDailyReports: builder.query<
      DailyReport[],
      { startDate?: string; endDate?: string; userId?: string; departmentId?: string } | void
    >({
      query: (params) => ({
        url: '',
        params: params || undefined,
      }),
      providesTags: ['DailyReports'],
    }),

    // Actualizeaza raport propriu
    updateDailyReport: builder.mutation<DailyReport, { id: string; data: UpdateDailyReportDto }>({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['DailyReports', 'MyDailyReports', 'TodayReport'],
    }),

    // Rapoarte lipsa (admin/manager)
    getMissingReports: builder.query<MissingReportsByDate[], { startDate: string; endDate: string }>({
      query: (params) => ({
        url: '/missing',
        params,
      }),
      providesTags: ['MissingReports'],
    }),

    // Admin adauga comentariu
    addAdminComment: builder.mutation<DailyReport, { id: string; data: AdminCommentDto }>({
      query: ({ id, data }) => ({
        url: `/${id}/comment`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['DailyReports'],
    }),
  }),
});

export const {
  useCreateDailyReportMutation,
  useGetTodayReportQuery,
  useGetMyDailyReportsQuery,
  useGetAllDailyReportsQuery,
  useGetMissingReportsQuery,
  useUpdateDailyReportMutation,
  useAddAdminCommentMutation,
} = dailyReportsApi;
