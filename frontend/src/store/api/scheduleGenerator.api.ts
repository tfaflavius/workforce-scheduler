import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export interface GeneratedAssignment {
  userId: string;
  shiftDate: string;
  shiftTypeId: string;
  workPositionId: string;
  notes: string;
}

export interface GenerationResult {
  assignments: GeneratedAssignment[];
  warnings: string[];
  stats: {
    totalAssignments: number;
    usersScheduled: number;
    replacementsNeeded: number;
    replacementsFound: number;
  };
}

export const scheduleGeneratorApi = createApi({
  reducerPath: 'scheduleGeneratorApi',
  baseQuery: createAuthBaseQuery('/schedules'),
  endpoints: (builder) => ({
    // Preview auto-generate (nu salveaza)
    previewAutoGenerate: builder.mutation<GenerationResult, string>({
      query: (monthYear) => ({
        url: '/auto-generate/preview',
        method: 'POST',
        body: { monthYear },
      }),
    }),

    // Auto-generate si salveaza
    autoGenerateSchedule: builder.mutation<GenerationResult, string>({
      query: (monthYear) => ({
        url: '/auto-generate',
        method: 'POST',
        body: { monthYear },
      }),
    }),
  }),
});

export const {
  usePreviewAutoGenerateMutation,
  useAutoGenerateScheduleMutation,
} = scheduleGeneratorApi;
