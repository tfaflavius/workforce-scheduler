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

export const CHAT_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '✅'] as const;

export interface ChatReactionSummary {
  emoji: string;
  count: number;
  mine: boolean;
  names: string[];
}

export interface ChatMessageItem {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  message: string;
  createdAt: string;
  /** Grupuri de departament: de unde si catre cine a fost trimis mesajul */
  fromDepartment?: string | null;
  toDepartments?: string[];
  alsoVisibleTo?: string[];
  /** Reactiile (emoji) la mesaj */
  reactions?: ChatReactionSummary[];
  /** Mesajul la care se raspunde (citat deasupra) */
  replyTo?: { id: string; userName: string; text: string; deleted?: boolean };
}

export interface ChatComposeInfo {
  multi: boolean;
  options: Array<{ id: string; name: string }>;
  defaultTargetIds: string[];
}

export interface ChatMessagesResponse {
  canWrite: boolean;
  hasMore: boolean;
  /** Conversatii private: pana unde a citit celalalt (pentru "Vazut") */
  otherReadAt?: string | null;
  compose?: ChatComposeInfo | null;
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
  // Date proaspete: reincarcare la revenirea in aplicatie / reconectare si la intrarea pe
  // o pagina daca datele au peste 30s; pastrate in memorie 5 min ca paginile sa apara imediat.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30,
  keepUnusedDataFor: 300,
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
    sendChatMessage: builder.mutation<ChatMessagesResponse, { id: string; message: string; targetDepartmentIds?: string[]; replyToId?: string }>({
      query: ({ id, message, targetDepartmentIds, replyToId }) => ({
        url: `/conversations/${id}/messages`,
        method: 'POST',
        body: { message, targetDepartmentIds, replyToId },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Messages', id }, 'Conversations'],
    }),
    deleteChatMessage: builder.mutation<{ ok: boolean }, { id: string; conversationId: string }>({
      query: ({ id }) => ({ url: `/messages/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { conversationId }) => [{ type: 'Messages', id: conversationId }, 'Conversations'],
    }),
    toggleChatReaction: builder.mutation<
      { ok: boolean; active: boolean },
      { messageId: string; conversationId: string; emoji: string; myName?: string }
    >({
      query: ({ messageId, conversationId, emoji }) => ({
        url: `/messages/${messageId}/reactions`,
        method: 'POST',
        body: { conversationId, emoji },
      }),
      // Actualizare instanta pe ecran; serverul confirma in fundal
      async onQueryStarted({ messageId, conversationId, emoji, myName }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          chatApi.util.updateQueryData('getChatMessages', conversationId, (draft) => {
            const m = draft.messages.find((x) => x.id === messageId);
            if (!m) return;
            const list = m.reactions || (m.reactions = []);
            const item = list.find((r) => r.emoji === emoji);
            if (item?.mine) {
              item.count -= 1;
              item.mine = false;
              if (myName) item.names = item.names.filter((n) => n !== myName);
              if (item.count <= 0) m.reactions = list.filter((r) => r !== item);
            } else if (item) {
              item.count += 1;
              item.mine = true;
              if (myName) item.names.push(myName);
            } else {
              list.push({ emoji, count: 1, mine: true, names: myName ? [myName] : [] });
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const {
  useToggleChatReactionMutation,
  useGetConversationsQuery,
  useGetChatUnreadCountQuery,
  useGetChatUsersQuery,
  useStartDirectChatMutation,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useDeleteChatMessageMutation,
} = chatApi;
