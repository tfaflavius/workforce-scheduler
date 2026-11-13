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
  lockedGroups?: string[];
  /** Inchisa pentru grupul curent */
  locked?: boolean;
}

export interface HolidayGroupInfo {
  key: string;
  name: string;
}

export interface HolidayPeriodsResponse {
  periods: HolidayPeriod[];
  groups: HolidayGroupInfo[];
  groupKey: string;
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
  group: HolidayGroupInfo & { choices: HolidayChoice[]; office: boolean };
  groups: HolidayGroupInfo[];
  locked: boolean;
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
    getHolidayPeriods: builder.query<HolidayPeriodsResponse, string | undefined>({
      query: (group) => ({ url: '/periods', params: group ? { group } : undefined }),
      providesTags: ['HolidayPeriods'],
    }),
    getHolidayPeriod: builder.query<HolidayPeriodDetails, { id: string; group?: string }>({
      query: ({ id, group }) => ({ url: `/periods/${id}`, params: group ? { group } : undefined }),
      providesTags: (_r, _e, { id }) => [{ type: 'HolidayPeriod', id }],
    }),
    saveHolidayPreferences: builder.mutation<HolidayPeriodDetails, SavePreferencesPayload>({
      query: ({ periodId, userId, preferences }) => ({
        url: userId ? `/periods/${periodId}/users/${userId}` : `/periods/${periodId}/me`,
        method: 'PUT',
        body: { preferences },
      }),
      invalidatesTags: (_r, _e, { periodId }) => [{ type: 'HolidayPeriod', id: periodId }, 'HolidayPeriods'],
    }),
    setHolidayGroupLock: builder.mutation<HolidayPeriodDetails, { id: string; group: string; locked: boolean }>({
      query: ({ id, group, locked }) => ({ url: `/periods/${id}/lock`, method: 'PATCH', body: { group, locked } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'HolidayPeriod', id }, 'HolidayPeriods'],
    }),
    updateHolidayPeriod: builder.mutation<
      HolidayPeriod,
      { id: string; startDate?: string; endDate?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/periods/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'HolidayPeriod', id }, 'HolidayPeriods'],
    }),
    applyHolidayToSchedule: builder.mutation<ApplyScheduleResult, { id: string; group: string }>({
      query: ({ id, group }) => ({ url: `/periods/${id}/apply-schedule`, method: 'POST', params: { group } }),
    }),
    createHolidayLeaveRequests: builder.mutation<CreateLeaveResult, { id: string; group: string }>({
      query: ({ id, group }) => ({ url: `/periods/${id}/create-leave-requests`, method: 'POST', params: { group } }),
    }),
    getHolidayMessages: builder.query<HolidayMessage[], { periodId: string; group: string }>({
      query: ({ periodId, group }) => ({ url: `/periods/${periodId}/messages`, params: { group } }),
      providesTags: (_r, _e, { periodId, group }) => [{ type: 'HolidayMessages', id: `${periodId}:${group}` }],
    }),
    postHolidayMessage: builder.mutation<HolidayMessage[], { periodId: string; group: string; message: string }>({
      query: ({ periodId, group, message }) => ({
        url: `/periods/${periodId}/messages`,
        method: 'POST',
        params: { group },
        body: { message },
      }),
      invalidatesTags: (_r, _e, { periodId, group }) => [{ type: 'HolidayMessages', id: `${periodId}:${group}` }],
    }),
    deleteHolidayMessage: builder.mutation<HolidayMessage[], { periodId: string; group: string; messageId: string }>({
      query: ({ periodId, messageId }) => ({ url: `/periods/${periodId}/messages/${messageId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { periodId, group }) => [{ type: 'HolidayMessages', id: `${periodId}:${group}` }],
    }),
  }),
});

export const {
  useGetHolidayPeriodsQuery,
  useGetHolidayPeriodQuery,
  useSaveHolidayPreferencesMutation,
  useUpdateHolidayPeriodMutation,
  useSetHolidayGroupLockMutation,
  useApplyHolidayToScheduleMutation,
  useCreateHolidayLeaveRequestsMutation,
  useGetHolidayMessagesQuery,
  usePostHolidayMessageMutation,
  useDeleteHolidayMessageMutation,
} = holidayPreferencesApi;
