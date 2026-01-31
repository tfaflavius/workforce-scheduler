import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Notification {
  id: string;
  userId: string;
  type: 'SCHEDULE_CREATED' | 'SCHEDULE_UPDATED' | 'SCHEDULE_APPROVED' | 'SCHEDULE_REJECTED' | 'SHIFT_REMINDER' | 'SHIFT_SWAP_REQUEST' | 'SHIFT_SWAP_ACCEPTED' | 'SHIFT_SWAP_REJECTED' | 'EMPLOYEE_ABSENT' | 'GENERAL';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
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
  tagTypes: ['Notification', 'UnreadCount'],
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
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllReadMutation,
} = notificationsApi;
