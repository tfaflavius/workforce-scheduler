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
  // Date proaspete: reincarcare la revenirea in aplicatie / reconectare si la intrarea pe
  // o pagina daca datele au peste 30s; pastrate in memorie 5 min ca paginile sa apara imediat.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30,
  keepUnusedDataFor: 300,
  baseQuery: createAuthBaseQuery(),
  endpoints: (builder) => ({
    search: builder.query<SearchResult[], string>({
      query: (q) => `/search?q=${encodeURIComponent(q)}`,
    }),
  }),
});

export const { useLazySearchQuery } = searchApi;
