import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import type { RootState } from '../store';
import { supabase } from '../../lib/supabase';
import { updateToken, logout } from '../slices/auth.slice';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Shared base query factory for all RTK Query API slices.
 * Centralizes the API URL and auth token injection.
 *
 * On a 401 (token expired/invalid) it refreshes the Supabase session once,
 * syncs the fresh token into the store, and retries the request — so a request
 * fired after the access token expired (e.g. the phone was locked while the user
 * wrote a report) no longer fails with "Token invalid". If the session can't be
 * refreshed at all (refresh token expired/rotated), it signs out cleanly so the
 * user is sent to the login screen instead of being stuck on "Token invalid".
 *
 * Usage:
 *   import { createAuthBaseQuery } from './baseQuery';
 *
 *   export const myApi = createApi({
 *     baseQuery: createAuthBaseQuery(),           // for /api base
 *     baseQuery: createAuthBaseQuery('/reports'),  // for /api/reports base
 *   });
 */
export const createAuthBaseQuery = (
  basePath = '',
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> => {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl: basePath ? `${API_URL}${basePath}` : API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    // Token expirat/invalid -> incearca sa reimprospatezi sesiunea si reincearca o data
    if (result.error && result.error.status === 401) {
      let refreshedToken: string | null = null;
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error) refreshedToken = data?.session?.access_token ?? null;
      } catch {
        refreshedToken = null;
      }

      if (refreshedToken) {
        // Sesiune reimprospatata cu succes -> sincronizeaza si reincearca
        api.dispatch(updateToken(refreshedToken));
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        // Nu se poate reimprospata (refresh token expirat/rotit) -> delogare curata,
        // ca userul sa fie trimis la login in loc sa ramana blocat pe "Token invalid".
        try {
          await supabase.auth.signOut();
        } catch {
          // ignora
        }
        api.dispatch(logout());
      }
    }

    return result;
  };
};

export { API_URL };
