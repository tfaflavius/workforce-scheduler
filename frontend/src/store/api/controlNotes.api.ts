import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export interface ControlNotesMonthMeta {
  month: number;
  label: string;
  totalDays: number;
  weekendDays: number;
  holidayDays: number;
  workingDays: number;
  holidayDates: string[];
  totalCount: number;
}

export interface ControlNotesUserRow {
  userId: string;
  agentCode: string | null;
  fullName: string;
  isActive: boolean;
  monthlyCounts: (number | null)[];
  monthlyMarkers: (string | null)[];
  total: number;
  averagePerWorkingDay: number;
}

export interface ControlNotesMatrix {
  year: number;
  months: ControlNotesMonthMeta[];
  users: ControlNotesUserRow[];
  totals: {
    grandTotal: number;
    totalWorkingDays: number;
    averagePerWorkingDay: number;
  };
}

export interface UpsertControlNoteDto {
  userId: string;
  year: number;
  month: number;
  count: number;
  marker?: string | null;
  notes?: string | null;
}

export interface ControlNotesMyStats {
  year: number;
  isControlUser: boolean;
  myTotal: number;
  currentMonthCount: number;
  myAveragePerWorkingDay: number;
  combinedAveragePerWorkingDay: number;
  percentageVsCombined: number; // >0 peste medie, <0 sub medie
}

export const controlNotesApi = createApi({
  reducerPath: 'controlNotesApi',
  baseQuery: createAuthBaseQuery(),
  keepUnusedDataFor: 300, // 5 min — keep matrix warm so switching tabs is instant
  tagTypes: ['ControlNotesMatrix'],
  endpoints: (builder) => ({
    getControlNotesMatrix: builder.query<ControlNotesMatrix, number | void>({
      query: (year) => ({
        url: '/control-inspection-notes',
        params: year ? { year } : undefined,
      }),
      providesTags: (_r, _e, year) => [
        { type: 'ControlNotesMatrix', id: year ?? 'CURRENT' },
      ],
    }),
    getMyControlNotesStats: builder.query<ControlNotesMyStats, number | void>({
      query: (year) => ({
        url: '/control-inspection-notes/my-stats',
        params: year ? { year } : undefined,
      }),
      providesTags: [{ type: 'ControlNotesMatrix', id: 'MY_STATS' }],
    }),
    upsertControlNote: builder.mutation<unknown, UpsertControlNoteDto>({
      query: (body) => ({
        url: '/control-inspection-notes',
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, dto) => [
        { type: 'ControlNotesMatrix', id: dto.year },
        { type: 'ControlNotesMatrix', id: 'CURRENT' },
      ],
    }),
    deleteControlNoteCell: builder.mutation<
      unknown,
      { userId: string; year: number; month: number }
    >({
      query: ({ userId, year, month }) => ({
        url: `/control-inspection-notes/${userId}/${year}/${month}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { year }) => [
        { type: 'ControlNotesMatrix', id: year },
        { type: 'ControlNotesMatrix', id: 'CURRENT' },
      ],
    }),
  }),
});

export const {
  useGetControlNotesMatrixQuery,
  useGetMyControlNotesStatsQuery,
  useUpsertControlNoteMutation,
  useDeleteControlNoteCellMutation,
} = controlNotesApi;
