import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export type NotificationType =
  | 'SCHEDULE_CREATED'
  | 'SCHEDULE_UPDATED'
  | 'SCHEDULE_APPROVED'
  | 'SCHEDULE_REJECTED'
  | 'SHIFT_REMINDER'
  | 'SHIFT_SWAP_REQUEST'
  | 'SHIFT_SWAP_RESPONSE'
  | 'SHIFT_SWAP_ACCEPTED'
  | 'SHIFT_SWAP_APPROVED'
  | 'SHIFT_SWAP_REJECTED'
  | 'EMPLOYEE_ABSENT'
  | 'GENERAL'
  | 'LEAVE_REQUEST_CREATED'
  | 'LEAVE_REQUEST_APPROVED'
  | 'LEAVE_REQUEST_REJECTED'
  | 'LEAVE_OVERLAP_WARNING'
  | 'PARKING_ISSUE_ASSIGNED'
  | 'PARKING_ISSUE_RESOLVED'
  | 'EDIT_REQUEST_CREATED'
  | 'EDIT_REQUEST_APPROVED'
  | 'EDIT_REQUEST_REJECTED';

export interface NotificationData {
  scheduleId?: string;
  shiftSwapId?: string;
  leaveRequestId?: string;
  parkingIssueId?: string;
  parkingDamageId?: string;
  cashCollectionId?: string;
  editRequestId?: string;
  entityType?: 'PARKING_ISSUE' | 'PARKING_DAMAGE' | 'CASH_COLLECTION';
  [key: string]: any;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface PushSubscriptionStatus {
  subscribed: boolean;
}

export interface VapidKeyResponse {
  publicKey: string;
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
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
  tagTypes: ['Notification', 'UnreadCount', 'PushStatus'],
  endpoints: (builder) => ({
    // Queries
    getNotifications: builder.query<Notification[], { unreadOnly?: boolean; limit?: number } | void>({
      query: (params) => ({
        url: '/notifications',
        params: params ? {
          unreadOnly: params.unreadOnly,
          limit: params.limit,
        } : undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Notification' as const, id })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),

    getUnreadCount: builder.query<number, void>({
      query: () => '/notifications/unread-count',
      providesTags: ['UnreadCount'],
    }),

    // Mutations
    markAsRead: builder.mutation<Notification, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        'UnreadCount',
      ],
    }),

    markAllAsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/mark-all-read',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }, 'UnreadCount'],
    }),

    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }, 'UnreadCount'],
    }),

    deleteAllRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/read/all',
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),

    // Push Notification Endpoints
    getVapidPublicKey: builder.query<VapidKeyResponse, void>({
      query: () => '/notifications/push/vapid-public-key',
    }),

    getPushStatus: builder.query<PushSubscriptionStatus, void>({
      query: () => '/notifications/push/status',
      providesTags: ['PushStatus'],
    }),

    subscribeToPush: builder.mutation<void, PushSubscriptionJSON>({
      query: (subscription) => ({
        url: '/notifications/push/subscribe',
        method: 'POST',
        body: subscription,
      }),
      invalidatesTags: ['PushStatus'],
    }),

    unsubscribeFromPush: builder.mutation<void, string>({
      query: (endpoint) => ({
        url: '/notifications/push/unsubscribe',
        method: 'POST',
        body: { endpoint },
      }),
      invalidatesTags: ['PushStatus'],
    }),

    testPushNotification: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/notifications/push/test',
        method: 'POST',
      }),
    }),

    clearAllPushSubscriptions: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/notifications/push/clear-all',
        method: 'DELETE',
      }),
      invalidatesTags: ['PushStatus'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllReadMutation,
  // Push hooks
  useGetVapidPublicKeyQuery,
  useGetPushStatusQuery,
  useSubscribeToPushMutation,
  useUnsubscribeFromPushMutation,
  useTestPushNotificationMutation,
  useClearAllPushSubscriptionsMutation,
} = notificationsApi;
