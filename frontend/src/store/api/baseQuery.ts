import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Shared base query factory for all RTK Query API slices.
 * Centralizes the API URL and auth token injection.
 *
 * Usage:
 *   import { createAuthBaseQuery } from './baseQuery';
 *
 *   export const myApi = createApi({
 *     baseQuery: createAuthBaseQuery(),           // for /api base
 *     baseQuery: createAuthBaseQuery('/reports'),  // for /api/reports base
 *   });
 */
export const createAuthBaseQuery = (basePath = '') =>
  fetchBaseQuery({
    baseUrl: basePath ? `${API_URL}${basePath}` : API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

export { API_URL };
