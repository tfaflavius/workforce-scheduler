import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { notificationsApi } from '../store/api/notifications.api';
import { chatApi } from '../store/api/chat.api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Notificari si chat in timp real (Server-Sent Events).
 * Serverul trimite doar un semnal ("ai o notificare noua" / "s-a schimbat ceva in chat"),
 * iar aplicatia isi reincarca pe loc datele respective. Daca legatura cade, se reconecteaza
 * singura; intre timp actualizarile periodice obisnuite raman ca rezerva.
 */
export function useRealtimeEvents() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);

  useEffect(() => {
    if (!token || typeof window === 'undefined' || !('EventSource' in window)) return;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let attempt = 0;

    const refreshNotifications = () =>
      dispatch(notificationsApi.util.invalidateTags([{ type: 'Notification', id: 'LIST' }, 'UnreadCount']));
    const refreshChat = () => dispatch(chatApi.util.invalidateTags(['Conversations', 'Messages', 'Unread']));

    const connect = async () => {
      if (stopped) return;
      // Nu tinem conexiunea deschisa cat aplicatia e in fundal (baterie / server)
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch(`${API_URL}/events/ticket`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(String(res.status));
        const { ticket } = (await res.json()) as { ticket: string };
        if (stopped) return;
        source = new EventSource(`${API_URL}/events?ticket=${encodeURIComponent(ticket)}`);
        source.addEventListener('ready', () => {
          attempt = 0;
        });
        source.addEventListener('notification', refreshNotifications);
        source.addEventListener('chat', () => {
          refreshChat();
          refreshNotifications();
        });
        source.onerror = () => {
          // Biletul e de unica folosinta: la orice cadere cerem unul nou
          source?.close();
          source = null;
          scheduleRetry();
        };
      } catch {
        scheduleRetry();
      }
    };

    const scheduleRetry = () => {
      if (stopped || retryTimer) return;
      attempt += 1;
      const delay = Math.min(60_000, 3_000 * 2 ** Math.min(attempt, 5));
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        source?.close();
        source = null;
      } else if (!source && !retryTimer) {
        attempt = 0;
        connect();
      }
    };

    connect();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, [token, dispatch]);
}
