import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Department {
  id: string;
  name: string;
  managerId: string | null;
  parentDepartmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const departmentsApi = createApi({
  reducerPath: 'departmentsApi',
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
  tagTypes: ['Department'],
  endpoints: (builder) => ({
    getDepartments: builder.query<Department[], void>({
      query: () => '/departments',
      providesTags: ['Department'],
    }),

    getDepartment: builder.query<Department, string>({
      query: (id) => `/departments/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Department', id }],
    }),
  }),
});

export const { useGetDepartmentsQuery, useGetDepartmentQuery } = departmentsApi;
