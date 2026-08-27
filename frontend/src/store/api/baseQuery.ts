import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import type { RootState } from '../store';
import { supabase } from '../../lib/supabase';
import { updateToken } from '../slices/auth.slice';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Shared base query factory for all RTK Query API slices.
 * Centralizes the API URL and auth token injection.
 *
 * On a 401 (token expired/invalid) it refreshes the Supabase session once,
 * syncs the fresh token into the store, and retries the request — so a request
 * fired after the access token expired (e.g. the phone was locked while the user
 * wrote a report) no longer fails with "Token invalid".
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

    // Token expirat/invalid -> reimprospateaza sesiunea Supabase si reincearca o data
    if (result.error && result.error.status === 401) {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        const newToken = data?.session?.access_token;
        if (!error && newToken) {
          api.dispatch(updateToken(newToken));
          result = await rawBaseQuery(args, api, extraOptions);
        }
      } catch {
        // nu am putut reimprospata — returnam eroarea originala
      }
    }

    return result;
  };
};

export { API_URL };
