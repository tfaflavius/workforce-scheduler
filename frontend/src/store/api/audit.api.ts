import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export interface AuditLog {
  id: string;
  userId: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  action: string;
  entity: string;
  entityId?: string;
  description?: string;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogResponse {
  data: AuditLog[];
  total: number;
}

export interface AuditLogFilters {
  userId?: string;
  entity?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = createApi({
  reducerPath: 'auditApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['AuditLog'],
  keepUnusedDataFor: 60, // 1 min — audit data is time-sensitive
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditLogResponse, AuditLogFilters>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters.userId) params.set('userId', filters.userId);
        if (filters.entity) params.set('entity', filters.entity);
        if (filters.action) params.set('action', filters.action);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        if (filters.limit) params.set('limit', String(filters.limit));
        if (filters.offset) params.set('offset', String(filters.offset));
        return `/audit?${params.toString()}`;
      },
      providesTags: ['AuditLog'],
    }),
    getRecentActivity: builder.query<AuditLog[], number | void>({
      query: (limit = 20) => `/audit/recent?limit=${limit}`,
      providesTags: ['AuditLog'],
    }),
    getAuditStats: builder.query<{
      total: number;
      today: number;
      thisWeek: number;
      byAction: Record<string, number>;
    }, void>({
      query: () => '/audit/stats',
      providesTags: ['AuditLog'],
    }),
  }),
});

export const { useGetAuditLogsQuery, useGetRecentActivityQuery, useGetAuditStatsQuery } = auditApi;
