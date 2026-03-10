import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  PermissionMatrix,
  UserPermissionOverride,
  TaskFlowRule,
  EmailNotificationRule,
  EffectivePermissions,
  PermissionSummary,
  BulkUpdateItem,
  OverrideItem,
  CreateTaskFlowRequest,
  CreateEmailRuleRequest,
} from '../../types/permission.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const permissionsApi = createApi({
  reducerPath: 'permissionsApi',
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
  tagTypes: ['Permission', 'UserOverride', 'TaskFlow', 'PermissionSummary', 'EmailRule'],
  endpoints: (builder) => ({
    // Permission Matrix
    getMatrix: builder.query<PermissionMatrix, void>({
      query: () => '/permissions/matrix',
      providesTags: ['Permission'],
    }),

    bulkUpdate: builder.mutation<{ updated: number }, { updates: BulkUpdateItem[] }>({
      query: (body) => ({
        url: '/permissions/bulk',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Permission', 'PermissionSummary'],
    }),

    updatePermission: builder.mutation<void, { id: string; allowed: boolean }>({
      query: ({ id, allowed }) => ({
        url: `/permissions/${id}`,
        method: 'PATCH',
        body: { allowed },
      }),
      invalidatesTags: ['Permission', 'PermissionSummary'],
    }),

    // User Overrides
    getUserOverrides: builder.query<UserPermissionOverride[], string>({
      query: (userId) => `/permissions/users/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: 'UserOverride', id: userId }],
    }),

    setUserOverrides: builder.mutation<UserPermissionOverride[], { userId: string; overrides: OverrideItem[] }>({
      query: ({ userId, overrides }) => ({
        url: `/permissions/users/${userId}`,
        method: 'PUT',
        body: { overrides },
      }),
      invalidatesTags: (_result, _error, { userId }) => [{ type: 'UserOverride', id: userId }],
    }),

    removeUserOverride: builder.mutation<void, { userId: string; overrideId: string }>({
      query: ({ userId, overrideId }) => ({
        url: `/permissions/users/${userId}/${overrideId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { userId }) => [{ type: 'UserOverride', id: userId }],
    }),

    // Effective Permissions
    getEffectivePermissions: builder.query<EffectivePermissions, string>({
      query: (userId) => `/permissions/effective/${userId}`,
      providesTags: (_result, _error, userId) => [
        { type: 'Permission', id: `effective-${userId}` },
        { type: 'UserOverride', id: userId },
      ],
    }),

    // Task Flows
    getTaskFlows: builder.query<TaskFlowRule[], void>({
      query: () => '/permissions/task-flows',
      providesTags: ['TaskFlow'],
    }),

    createTaskFlow: builder.mutation<TaskFlowRule, CreateTaskFlowRequest>({
      query: (body) => ({
        url: '/permissions/task-flows',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TaskFlow'],
    }),

    updateTaskFlow: builder.mutation<TaskFlowRule, { id: string; data: Partial<CreateTaskFlowRequest> }>({
      query: ({ id, data }) => ({
        url: `/permissions/task-flows/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['TaskFlow'],
    }),

    deleteTaskFlow: builder.mutation<void, string>({
      query: (id) => ({
        url: `/permissions/task-flows/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TaskFlow'],
    }),

    // Email Notification Rules
    getEmailRules: builder.query<EmailNotificationRule[], void>({
      query: () => '/permissions/email-rules',
      providesTags: ['EmailRule'],
    }),

    createEmailRule: builder.mutation<EmailNotificationRule, CreateEmailRuleRequest>({
      query: (body) => ({
        url: '/permissions/email-rules',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EmailRule'],
    }),

    updateEmailRule: builder.mutation<EmailNotificationRule, { id: string; data: Partial<CreateEmailRuleRequest> }>({
      query: ({ id, data }) => ({
        url: `/permissions/email-rules/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['EmailRule'],
    }),

    deleteEmailRule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/permissions/email-rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['EmailRule'],
    }),

    // Seed & Summary
    seedDefaults: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/permissions/seed',
        method: 'POST',
      }),
      invalidatesTags: ['Permission', 'TaskFlow', 'PermissionSummary', 'EmailRule'],
    }),

    getSummary: builder.query<PermissionSummary, void>({
      query: () => '/permissions/summary',
      providesTags: ['PermissionSummary'],
    }),
  }),
});

export const {
  useGetMatrixQuery,
  useBulkUpdateMutation,
  useUpdatePermissionMutation,
  useGetUserOverridesQuery,
  useSetUserOverridesMutation,
  useRemoveUserOverrideMutation,
  useGetEffectivePermissionsQuery,
  useGetTaskFlowsQuery,
  useCreateTaskFlowMutation,
  useUpdateTaskFlowMutation,
  useDeleteTaskFlowMutation,
  useGetEmailRulesQuery,
  useCreateEmailRuleMutation,
  useUpdateEmailRuleMutation,
  useDeleteEmailRuleMutation,
  useSeedDefaultsMutation,
  useGetSummaryQuery,
} = permissionsApi;
