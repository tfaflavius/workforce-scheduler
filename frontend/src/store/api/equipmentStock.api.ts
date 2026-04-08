import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

// ===== Types =====

export interface StockDefinitionItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockEntryUser {
  id: string;
  fullName: string;
}

export interface StockEntryItem {
  id: string;
  definitionId: string;
  definition: StockDefinitionItem;
  quantity: number;
  location: string | null;
  notes: string | null;
  dateAdded: string;
  addedBy: StockEntryUser;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDefinitionDto {
  name: string;
  category: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateDefinitionDto {
  name?: string;
  category?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateEntryDto {
  definitionId: string;
  quantity: number;
  location?: string;
  notes?: string;
  dateAdded?: string;
}

export interface UpdateEntryDto {
  definitionId?: string;
  quantity?: number;
  location?: string;
  notes?: string;
  dateAdded?: string;
}

// ===== API =====

export const equipmentStockApi = createApi({
  reducerPath: 'equipmentStockApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['StockDefinition', 'StockEntry'],
  endpoints: (builder) => ({

    // ===== DEFINITIONS =====

    getDefinitions: builder.query<StockDefinitionItem[], { category?: string } | void>({
      query: (params) => ({
        url: '/equipment-stock/definitions',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'StockDefinition' as const, id })),
              { type: 'StockDefinition', id: 'LIST' },
            ]
          : [{ type: 'StockDefinition', id: 'LIST' }],
    }),

    createDefinition: builder.mutation<StockDefinitionItem, CreateDefinitionDto>({
      query: (body) => ({
        url: '/equipment-stock/definitions',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'StockDefinition', id: 'LIST' }],
    }),

    updateDefinition: builder.mutation<StockDefinitionItem, { id: string } & UpdateDefinitionDto>({
      query: ({ id, ...body }) => ({
        url: `/equipment-stock/definitions/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'StockDefinition', id },
        { type: 'StockDefinition', id: 'LIST' },
      ],
    }),

    deleteDefinition: builder.mutation<void, string>({
      query: (id) => ({
        url: `/equipment-stock/definitions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'StockDefinition', id: 'LIST' },
        { type: 'StockEntry', id: 'LIST' },
      ],
    }),

    // ===== ENTRIES =====

    getEntries: builder.query<StockEntryItem[], { category: string; search?: string }>({
      query: ({ category, search }) => ({
        url: '/equipment-stock/entries',
        params: { category, ...(search ? { search } : {}) },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'StockEntry' as const, id })),
              { type: 'StockEntry', id: 'LIST' },
            ]
          : [{ type: 'StockEntry', id: 'LIST' }],
    }),

    createEntry: builder.mutation<StockEntryItem, CreateEntryDto>({
      query: (body) => ({
        url: '/equipment-stock/entries',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'StockEntry', id: 'LIST' }],
    }),

    updateEntry: builder.mutation<StockEntryItem, { id: string } & UpdateEntryDto>({
      query: ({ id, ...body }) => ({
        url: `/equipment-stock/entries/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'StockEntry', id },
        { type: 'StockEntry', id: 'LIST' },
      ],
    }),

    deleteEntry: builder.mutation<void, string>({
      query: (id) => ({
        url: `/equipment-stock/entries/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'StockEntry', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetDefinitionsQuery,
  useCreateDefinitionMutation,
  useUpdateDefinitionMutation,
  useDeleteDefinitionMutation,
  useGetEntriesQuery,
  useCreateEntryMutation,
  useUpdateEntryMutation,
  useDeleteEntryMutation,
} = equipmentStockApi;
