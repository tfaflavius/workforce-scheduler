import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';
import type {
  OvertimeMonthlySummary,
  OvertimeReportFilters,
  OvertimeReportResponse,
} from '../../types/overtime.types';

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: createAuthBaseQuery(),
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
