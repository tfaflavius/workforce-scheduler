import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
}

export const searchApi = createApi({
  reducerPath: 'searchApi',
  baseQuery: createAuthBaseQuery(),
  endpoints: (builder) => ({
    search: builder.query<SearchResult[], string>({
      query: (q) => `/search?q=${encodeURIComponent(q)}`,
    }),
  }),
});

export const { useLazySearchQuery } = searchApi;
