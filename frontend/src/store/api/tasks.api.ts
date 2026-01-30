import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Task, CreateTaskRequest, UpdateTaskRequest, TaskHistory } from '../../types/task.types';
import type { RootState } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
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
  tagTypes: ['Task'],
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], {
      status?: string;
      priority?: string;
      assignedToId?: string;
      createdById?: string;
    } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.append('status', params.status);
        if (params?.priority) searchParams.append('priority', params.priority);
        if (params?.assignedToId) searchParams.append('assignedToId', params.assignedToId);
        if (params?.createdById) searchParams.append('createdById', params.createdById);

        const queryString = searchParams.toString();
        return `/tasks${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['Task'],
    }),
    getMyTasks: builder.query<Task[], void>({
      query: () => '/tasks/my-tasks',
      providesTags: ['Task'],
    }),
    getTask: builder.query<Task, string>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),
    getTaskHistory: builder.query<TaskHistory[], string>({
      query: (id) => `/tasks/${id}/history`,
    }),
    createTask: builder.mutation<Task, CreateTaskRequest>({
      query: (body) => ({
        url: '/tasks',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Task'],
    }),
    updateTask: builder.mutation<Task, { id: string; data: UpdateTaskRequest }>({
      query: ({ id, data }) => ({
        url: `/tasks/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Task', id }, 'Task'],
    }),
    deleteTask: builder.mutation<void, string>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Task'],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetMyTasksQuery,
  useGetTaskQuery,
  useGetTaskHistoryQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = tasksApi;
