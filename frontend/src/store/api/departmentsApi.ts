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
  // Date proaspete: reincarcare la revenirea in aplicatie / reconectare si la intrarea pe
  // o pagina daca datele au peste 30s; pastrate in memorie 5 min ca paginile sa apara imediat.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30,
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['Department'],
  keepUnusedDataFor: 300, // 5 min — departments rarely change
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
