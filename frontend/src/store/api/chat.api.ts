import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export type ChatConversationType = 'DIRECT' | 'DEPARTMENT' | 'ANNOUNCEMENTS';

export interface ChatConversationSummary {
  id: string;
  type: ChatConversationType;
  title: string;
  subtitle?: string;
  otherUserId?: string;
  canWrite: boolean;
  lastMessage?: { text: string; userName: string; userId: string; createdAt: string };
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessageItem {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  message: string;
  createdAt: string;
}

export interface ChatMessagesResponse {
  canWrite: boolean;
  hasMore: boolean;
  messages: ChatMessageItem[];
}

export interface ChatUser {
  id: string;
  fullName: string;
  role: string;
  departmentName: string | null;
}

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: createAuthBaseQuery('/chat'),
  tagTypes: ['Conversations', 'Messages', 'Unread'],
  endpoints: (builder) => ({
    getConversations: builder.query<ChatConversationSummary[], void>({
      query: () => '/conversations',
      providesTags: ['Conversations'],
    }),
    getChatUnreadCount: builder.query<{ count: number }, void>({
      query: () => '/unread-count',
      providesTags: ['Unread'],
    }),
    getChatUsers: builder.query<ChatUser[], void>({
      query: () => '/users',
    }),
    startDirectChat: builder.mutation<ChatConversationSummary, string>({
      query: (userId) => ({ url: '/direct', method: 'POST', body: { userId } }),
      invalidatesTags: ['Conversations'],
    }),
    getChatMessages: builder.query<ChatMessagesResponse, string>({
      query: (id) => `/conversations/${id}/messages`,
      providesTags: (_r, _e, id) => [{ type: 'Messages', id }],
      // Deschiderea conversatiei o marcheaza citita -> actualizeaza lista si contorul
      async onQueryStarted(_id, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(chatApi.util.invalidateTags(['Unread', 'Conversations']));
        } catch {
          /* ignorat */
        }
      },
    }),
    sendChatMessage: builder.mutation<ChatMessagesResponse, { id: string; message: string }>({
      query: ({ id, message }) => ({ url: `/conversations/${id}/messages`, method: 'POST', body: { message } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Messages', id }, 'Conversations'],
    }),
    deleteChatMessage: builder.mutation<{ ok: boolean }, { id: string; conversationId: string }>({
      query: ({ id }) => ({ url: `/messages/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { conversationId }) => [{ type: 'Messages', id: conversationId }, 'Conversations'],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetChatUnreadCountQuery,
  useGetChatUsersQuery,
  useStartDirectChatMutation,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useDeleteChatMessageMutation,
} = chatApi;
