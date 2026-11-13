import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export type HolidayChoice = 'LEAVE' | 'DAY' | 'NIGHT' | 'ANY';
export type HolidayPeriodKey = 'CRACIUN' | 'REVELION' | 'PASTE';

export interface HolidayPeriod {
  id: string;
  key: HolidayPeriodKey;
  year: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'LOCKED';
  respondedUsers?: number;
}

export interface HolidayPreference {
  id: string;
  userId: string;
  date: string;
  choice: HolidayChoice;
  note: string | null;
  updatedAt: string;
}

export interface HolidayPeriodDetails {
  period: HolidayPeriod;
  days: string[];
  users: Array<{ id: string; fullName: string; role: string }>;
  preferences: HolidayPreference[];
  canManage: boolean;
  currentUserId: string;
}

export interface SavePreferencesPayload {
  periodId: string;
  userId?: string; // lipsa = propriul rand
  preferences: Array<{ date: string; choice: HolidayChoice | null; note?: string | null }>;
}

export interface ApplyScheduleResult {
  status: string;
  results: Array<{ userId: string; month: string; days: number; ok: boolean; error?: string }>;
}

export interface CreateLeaveResult {
  results: Array<{ userName: string; startDate: string; endDate: string; ok: boolean; error?: string }>;
}

export interface HolidayMessage {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  message: string;
  createdAt: string;
}

export const holidayPreferencesApi = createApi({
  reducerPath: 'holidayPreferencesApi',
  baseQuery: createAuthBaseQuery('/holiday-preferences'),
  tagTypes: ['HolidayPeriods', 'HolidayPeriod', 'HolidayMessages'],
  endpoints: (builder) => ({
    getHolidayPeriods: builder.query<HolidayPeriod[], void>({
      query: () => '/periods',
      providesTags: ['HolidayPeriods'],
    }),
    getHolidayPeriod: builder.query<HolidayPeriodDetails, string>({
      query: (id) => `/periods/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'HolidayPeriod', id }],
    }),
    saveHolidayPreferences: builder.mutation<HolidayPeriodDetails, SavePreferencesPayload>({
      query: ({ periodId, userId, preferences }) => ({
        url: userId ? `/periods/${periodId}/users/${userId}` : `/periods/${periodId}/me`,
        method: 'PUT',
        body: { preferences },
      }),
      invalidatesTags: (_r, _e, { periodId }) => [{ type: 'HolidayPeriod', id: periodId }, 'HolidayPeriods'],
    }),
    updateHolidayPeriod: builder.mutation<
      HolidayPeriod,
      { id: string; startDate?: string; endDate?: string; status?: 'OPEN' | 'LOCKED' }
    >({
      query: ({ id, ...body }) => ({ url: `/periods/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'HolidayPeriod', id }, 'HolidayPeriods'],
    }),
    applyHolidayToSchedule: builder.mutation<ApplyScheduleResult, string>({
      query: (id) => ({ url: `/periods/${id}/apply-schedule`, method: 'POST' }),
    }),
    createHolidayLeaveRequests: builder.mutation<CreateLeaveResult, string>({
      query: (id) => ({ url: `/periods/${id}/create-leave-requests`, method: 'POST' }),
    }),
    getHolidayMessages: builder.query<HolidayMessage[], string>({
      query: (id) => `/periods/${id}/messages`,
      providesTags: (_r, _e, id) => [{ type: 'HolidayMessages', id }],
    }),
    postHolidayMessage: builder.mutation<HolidayMessage[], { periodId: string; message: string }>({
      query: ({ periodId, message }) => ({ url: `/periods/${periodId}/messages`, method: 'POST', body: { message } }),
      invalidatesTags: (_r, _e, { periodId }) => [{ type: 'HolidayMessages', id: periodId }],
    }),
    deleteHolidayMessage: builder.mutation<HolidayMessage[], { periodId: string; messageId: string }>({
      query: ({ periodId, messageId }) => ({ url: `/periods/${periodId}/messages/${messageId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { periodId }) => [{ type: 'HolidayMessages', id: periodId }],
    }),
  }),
});

export const {
  useGetHolidayPeriodsQuery,
  useGetHolidayPeriodQuery,
  useSaveHolidayPreferencesMutation,
  useUpdateHolidayPeriodMutation,
  useApplyHolidayToScheduleMutation,
  useCreateHolidayLeaveRequestsMutation,
  useGetHolidayMessagesQuery,
  usePostHolidayMessageMutation,
  useDeleteHolidayMessageMutation,
} = holidayPreferencesApi;
