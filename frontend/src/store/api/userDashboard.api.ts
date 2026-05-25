import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export interface UserDashboardStatsResponse {
  department: string;
  leaveRequests: {
    pending: number;
    approved: number;
    total: number;
  };
  dailyReports: {
    submitted: number;
    draft: number;
  };
  handicap?: {
    requestsByType: {
      amplasare: number;
      revocare: number;
      marcaje: number;
    };
    legitimationsCount: number;
    revolutionarCount: number;
  };
  domiciliu?: {
    active: number;
    finalizat: number;
    byType: {
      trasareLocuri: number;
      revocareLocuri: number;
      amplasarePanou: number;
      revocarePanou: number;
    };
  };
  controlSesizari?: {
    active: number;
    finalizat: number;
    byZone: { rosu: number; galben: number; alb: number };
  };
  parking?: {
    activeIssues: number;
    activeDamages: number;
    cashTotal: { totalAmount: number; count: number };
  };
  revenue?: {
    incasari: number;
    incasariCard: number;
    cheltuieli: number;
    month: number;
    year: number;
  };
  revenueYTD?: {
    incasari: number;
    incasariCard: number;
    cheltuieli: number;
    year: number;
  };
  controlNotes?: {
    year: number;
    grandTotal: number;
    totalWorkingDays: number;
    averagePerWorkingDay: number;
  };
  achizitii?: {
    totalBudget: number;
    investments: number;
    currentExpenses: number;
    totalSpent: number;
    acquisitionsCount: number;
  };
  equipmentStock?: {
    definitionsCount: number;
    totalQuantity: number;
    categoriesCount: number;
  };
}

export const userDashboardApi = createApi({
  reducerPath: 'userDashboardApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['UserDashboardStats'],
  endpoints: (builder) => ({
    getUserDashboardStats: builder.query<UserDashboardStatsResponse, void>({
      query: () => '/user/dashboard/stats',
      providesTags: ['UserDashboardStats'],
      keepUnusedDataFor: 60,
    }),
  }),
});

export const { useGetUserDashboardStatsQuery } = userDashboardApi;
