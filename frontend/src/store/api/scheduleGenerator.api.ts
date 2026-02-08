import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/schedules`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    // Preview auto-generate (nu salvează)
    previewAutoGenerate: builder.mutation<GenerationResult, string>({
      query: (monthYear) => ({
        url: '/auto-generate/preview',
        method: 'POST',
        body: { monthYear },
      }),
    }),

    // Auto-generate și salvează
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
