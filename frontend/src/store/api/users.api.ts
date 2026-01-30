import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'ADMIN' | 'MANAGER' | 'USER';
  departmentId: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  department?: {
    id: string;
    name: string;
  };
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER' | 'USER';
  departmentId?: string;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  phone?: string;
  role?: 'ADMIN' | 'MANAGER' | 'USER';
  departmentId?: string;
  isActive?: boolean;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserFilters {
  search?: string;
  role?: string;
  departmentId?: string;
  isActive?: boolean;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  byRole: Array<{ role: string; count: string }>;
  byDepartment: Array<{ departmentName: string; count: string }>;
}

export const usersApi = createApi({
  reducerPath: 'usersApi',
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
  tagTypes: ['User', 'UserStats'],
  endpoints: (builder) => ({
    // Queries
    getUsers: builder.query<User[], UserFilters | void>({
      query: (filters) => ({
        url: '/users',
        params: filters || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    getUser: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    getCurrentUser: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['User'],
    }),

    getUserStats: builder.query<UserStats, void>({
      query: () => '/users/stats',
      providesTags: ['UserStats'],
    }),

    // Mutations
    createUser: builder.mutation<User, CreateUserRequest>({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }, 'UserStats'],
    }),

    updateUser: builder.mutation<User, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        'UserStats',
      ],
    }),

    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }, 'UserStats'],
    }),

    changePassword: builder.mutation<{ message: string }, { id: string; data: ChangePasswordRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}/password`,
        method: 'PATCH',
        body: data,
      }),
    }),

    toggleUserStatus: builder.mutation<User, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/users/${id}/toggle-active`,
        method: 'PATCH',
        body: { isActive },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        'UserStats',
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useGetCurrentUserQuery,
  useGetUserStatsQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useChangePasswordMutation,
  useToggleUserStatusMutation,
} = usersApi;
