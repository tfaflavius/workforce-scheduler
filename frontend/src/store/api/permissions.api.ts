import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';
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
  NotificationSetting,
  NotificationSettingBulkUpdateItem,
} from '../../types/permission.types';

export interface ParkingEquipmentItem {
  id: string;
  name: string;
  category: 'ISSUE' | 'DAMAGE' | 'BOTH';
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEquipmentRequest {
  name: string;
  category: 'ISSUE' | 'DAMAGE' | 'BOTH';
  isActive?: boolean;
  sortOrder?: number;
}

export interface ContactFirmItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  isInternal: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactFirmRequest {
  name: string;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  isInternal?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export const permissionsApi = createApi({
  reducerPath: 'permissionsApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['Permission', 'UserOverride', 'TaskFlow', 'PermissionSummary', 'EmailRule', 'NotificationSetting', 'Equipment', 'ContactFirm'],
  keepUnusedDataFor: 600, // 10 min — config data changes rarely
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
      invalidatesTags: ['Permission', 'TaskFlow', 'PermissionSummary', 'EmailRule', 'NotificationSetting'],
    }),

    getSummary: builder.query<PermissionSummary, void>({
      query: () => '/permissions/summary',
      providesTags: ['PermissionSummary'],
    }),

    // Notification Settings
    getNotificationSettings: builder.query<NotificationSetting[], void>({
      query: () => '/permissions/notification-settings',
      providesTags: ['NotificationSetting'],
    }),

    bulkUpdateNotificationSettings: builder.mutation<
      { updated: number },
      { updates: NotificationSettingBulkUpdateItem[] }
    >({
      query: (body) => ({
        url: '/permissions/notification-settings/bulk',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['NotificationSetting'],
    }),

    // Parking Equipment
    getEquipment: builder.query<ParkingEquipmentItem[], void>({
      query: () => '/permissions/equipment',
      providesTags: ['Equipment'],
    }),

    createEquipment: builder.mutation<ParkingEquipmentItem, CreateEquipmentRequest>({
      query: (body) => ({
        url: '/permissions/equipment',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Equipment'],
    }),

    updateEquipment: builder.mutation<ParkingEquipmentItem, { id: string; data: Partial<CreateEquipmentRequest> }>({
      query: ({ id, data }) => ({
        url: `/permissions/equipment/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Equipment'],
    }),

    deleteEquipment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/permissions/equipment/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Equipment'],
    }),

    seedEquipment: builder.mutation<{ created: number }, void>({
      query: () => ({
        url: '/permissions/seed-equipment',
        method: 'POST',
      }),
      invalidatesTags: ['Equipment'],
    }),

    // Contact Firms
    getContactFirms: builder.query<ContactFirmItem[], void>({
      query: () => '/permissions/firms',
      providesTags: ['ContactFirm'],
    }),

    createContactFirm: builder.mutation<ContactFirmItem, CreateContactFirmRequest>({
      query: (body) => ({
        url: '/permissions/firms',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ContactFirm'],
    }),

    updateContactFirm: builder.mutation<ContactFirmItem, { id: string; data: Partial<CreateContactFirmRequest> }>({
      query: ({ id, data }) => ({
        url: `/permissions/firms/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['ContactFirm'],
    }),

    deleteContactFirm: builder.mutation<void, string>({
      query: (id) => ({
        url: `/permissions/firms/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ContactFirm'],
    }),

    seedContactFirms: builder.mutation<{ created: number }, void>({
      query: () => ({
        url: '/permissions/seed-firms',
        method: 'POST',
      }),
      invalidatesTags: ['ContactFirm'],
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
  useGetNotificationSettingsQuery,
  useBulkUpdateNotificationSettingsMutation,
  // Equipment
  useGetEquipmentQuery,
  useCreateEquipmentMutation,
  useUpdateEquipmentMutation,
  useDeleteEquipmentMutation,
  useSeedEquipmentMutation,
  // Contact Firms
  useGetContactFirmsQuery,
  useCreateContactFirmMutation,
  useUpdateContactFirmMutation,
  useDeleteContactFirmMutation,
  useSeedContactFirmsMutation,
} = permissionsApi;
