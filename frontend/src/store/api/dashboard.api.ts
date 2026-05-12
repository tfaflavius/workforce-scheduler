import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export interface DashboardStatsResponse {
  schedules: {
    pending: number;
    approved: number;
    rejected: number;
    draft: number;
  };
  todayDispatchers: {
    id: string;
    userId: string;
    userName: string;
    userEmail?: string;
    departmentName: string;
    shiftType: string;
    shiftCode: string;
    startTime?: string;
    endTime?: string;
    workPosition: string;
    workPositionCode: string;
  }[];
  activeUsersCount: number;
  shiftSwaps: {
    pendingAdmin: number;
    total: number;
  };
  leaveRequests: {
    pending: number;
    total: number;
  };
  parking: {
    activeIssues: number;
    urgentIssues: { id: string; equipment: string; parkingLotId: string; createdAt: string }[];
    activeDamages: number;
    urgentDamages: { id: string; damagedEquipment: string; parkingLotId: string; createdAt: string }[];
    pendingEditRequests: number;
    cashCollectionTotals: { totalAmount: number; count: number };
  };
  handicap: {
    requestsByType: {
      amplasare: number;
      revocare: number;
      marcaje: number;
    };
    legitimationsCount: number;
    revolutionarCount: number;
  };
  recentNotifications: {
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt: string;
    isRead?: boolean;
  }[];
  carStatus: {
    carInUse: boolean;
    activeDaysCount: number;
    days: {
      id: string;
      dayOrder: number;
      displayDate: string;
      controlUser1Name: string | null;
      controlUser2Name: string | null;
      estimatedReturn: string;
    }[];
  };
  revenue: {
    incasari: number;
    incasariCard: number;
    cheltuieli: number;
    month: number;
    year: number;
  };
  controlSesizari: {
    active: number;
    finalizat: number;
    byZone: { rosu: number; galben: number; alb: number };
  };
  domiciliu: {
    active: number;
    finalizat: number;
    byType: { trasareLocuri: number; revocareLocuri: number; amplasarePanou: number; revocarePanou: number };
  };
  achizitii: {
    totalBudget: number;
    totalSpent: number;
    acquisitionsCount: number;
    investments: number;
    currentExpenses: number;
  };
  equipmentStock: {
    definitionsCount: number;
    totalQuantity: number;
    categoriesCount: number;
  };
  dailyReports: {
    submittedToday: number;
    draftToday: number;
  };
}

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['DashboardStats'],
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStatsResponse, void>({
      query: () => '/admin/dashboard/stats',
      providesTags: ['DashboardStats'],
      // Refetch every 60 seconds for live dashboard
      keepUnusedDataFor: 60,
    }),
  }),
});

export const { useGetDashboardStatsQuery } = dashboardApi;
