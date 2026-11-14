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
  // Date proaspete: reincarcare la revenirea in aplicatie / reconectare si la intrarea pe
  // o pagina daca datele au peste 30s; pastrate in memorie 5 min ca paginile sa apara imediat.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30,
  keepUnusedDataFor: 300,
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
