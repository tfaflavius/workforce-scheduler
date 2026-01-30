import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  OvertimeMonthlySummary,
  OvertimeReportFilters,
  OvertimeReportResponse,
} from '../../types/overtime.types';
import type { RootState } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['OvertimeReport'],
  endpoints: (builder) => ({
    // Get overtime data for a month (for display in UI)
    getOvertimeReport: builder.query<
      OvertimeMonthlySummary[],
      { monthYear: string; filters?: Omit<OvertimeReportFilters, 'format'> }
    >({
      query: ({ monthYear, filters }) => ({
        url: `/reports/overtime/${monthYear}`,
        params: filters,
      }),
      providesTags: ['OvertimeReport'],
    }),

    // Export overtime report as PDF or Excel
    exportOvertimeReport: builder.mutation<
      OvertimeReportResponse,
      { monthYear: string; filters: OvertimeReportFilters }
    >({
      query: ({ monthYear, filters }) => ({
        url: `/reports/overtime/${monthYear}`,
        params: filters,
      }),
    }),
  }),
});

export const { useGetOvertimeReportQuery, useExportOvertimeReportMutation } =
  reportsApi;
