import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';
import { removeDiacritics } from '../../utils/removeDiacritics';

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
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['Department'],
  endpoints: (builder) => ({
    getDepartments: builder.query<Department[], void>({
      query: () => '/departments',
      transformResponse: (response: Department[]) =>
        response.map(d => ({ ...d, name: removeDiacritics(d.name) })),
      providesTags: ['Department'],
    }),

    getDepartment: builder.query<Department, string>({
      query: (id) => `/departments/${id}`,
      transformResponse: (response: Department) => ({ ...response, name: removeDiacritics(response.name) }),
      providesTags: (_result, _error, id) => [{ type: 'Department', id }],
    }),
  }),
});

export const { useGetDepartmentsQuery, useGetDepartmentQuery } = departmentsApi;
