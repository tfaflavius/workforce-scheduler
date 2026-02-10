import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  ParkingLot,
  PaymentMachine,
  ParkingIssue,
  ParkingDamage,
  CashCollection,
  CashCollectionTotals,
  CreateParkingIssueDto,
  UpdateParkingIssueDto,
  ResolveIssueDto,
  CreateParkingDamageDto,
  ResolveDamageDto,
  CreateCashCollectionDto,
  ParkingIssueStatus,
  ParkingDamageStatus,
  ParkingComment,
  ParkingHistory,
  CreateCommentDto,
  EditRequest,
  EditRequestStatus,
  CreateEditRequestDto,
  ReviewEditRequestDto,
} from '../../types/parking.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const parkingApi = createApi({
  reducerPath: 'parkingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['ParkingLots', 'PaymentMachines', 'ParkingIssues', 'ParkingDamages', 'CashCollections', 'IssueComments', 'DamageComments', 'IssueHistory', 'DamageHistory', 'EditRequests'],
  endpoints: (builder) => ({
    // Parking Lots
    getParkingLots: builder.query<ParkingLot[], void>({
      query: () => '/parking-lots',
      providesTags: ['ParkingLots'],
    }),

    getParkingLot: builder.query<ParkingLot, string>({
      query: (id) => `/parking-lots/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ParkingLots', id }],
    }),

    // Payment Machines
    getPaymentMachines: builder.query<PaymentMachine[], string | void>({
      query: (parkingLotId) => ({
        url: '/parking-lots/payment-machines',
        params: parkingLotId ? { parkingLotId } : undefined,
      }),
      providesTags: ['PaymentMachines'],
    }),

    // Constants
    getEquipmentList: builder.query<string[], void>({
      query: () => '/parking-lots/constants/equipment',
    }),

    getDamageEquipmentList: builder.query<string[], void>({
      query: () => '/parking-lots/constants/damage-equipment',
    }),

    getCompanyList: builder.query<string[], void>({
      query: () => '/parking-lots/constants/companies',
    }),

    // Parking Issues
    getParkingIssues: builder.query<ParkingIssue[], ParkingIssueStatus | void>({
      query: (status) => ({
        url: '/parking-issues',
        params: status ? { status } : undefined,
      }),
      providesTags: ['ParkingIssues'],
    }),

    getUrgentIssues: builder.query<ParkingIssue[], void>({
      query: () => '/parking-issues/urgent',
      providesTags: ['ParkingIssues'],
    }),

    getMyAssignedIssues: builder.query<ParkingIssue[], void>({
      query: () => '/parking-issues/my-assigned',
      providesTags: ['ParkingIssues'],
    }),

    getParkingIssue: builder.query<ParkingIssue, string>({
      query: (id) => `/parking-issues/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ParkingIssues', id }],
    }),

    getIssueHistory: builder.query<ParkingHistory[], string>({
      query: (id) => `/parking-issues/${id}/history`,
      providesTags: (_result, _error, id) => [{ type: 'IssueHistory', id }],
    }),

    getIssueComments: builder.query<ParkingComment[], string>({
      query: (id) => `/parking-issues/${id}/comments`,
      providesTags: (_result, _error, id) => [{ type: 'IssueComments', id }],
    }),

    createParkingIssue: builder.mutation<ParkingIssue, CreateParkingIssueDto>({
      query: (body) => ({
        url: '/parking-issues',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ParkingIssues'],
    }),

    updateParkingIssue: builder.mutation<ParkingIssue, { id: string; data: UpdateParkingIssueDto }>({
      query: ({ id, data }) => ({
        url: `/parking-issues/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['ParkingIssues', 'IssueHistory'],
    }),

    resolveParkingIssue: builder.mutation<ParkingIssue, { id: string; data: ResolveIssueDto }>({
      query: ({ id, data }) => ({
        url: `/parking-issues/${id}/resolve`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['ParkingIssues', 'IssueHistory'],
    }),

    addIssueComment: builder.mutation<ParkingComment, { issueId: string; data: CreateCommentDto }>({
      query: ({ issueId, data }) => ({
        url: `/parking-issues/${issueId}/comments`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { issueId }) => [{ type: 'IssueComments', id: issueId }],
    }),

    deleteParkingIssue: builder.mutation<void, string>({
      query: (id) => ({
        url: `/parking-issues/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ParkingIssues'],
    }),

    // Parking Damages
    getParkingDamages: builder.query<ParkingDamage[], ParkingDamageStatus | void>({
      query: (status) => ({
        url: '/parking-damages',
        params: status ? { status } : undefined,
      }),
      providesTags: ['ParkingDamages'],
    }),

    getUrgentDamages: builder.query<ParkingDamage[], void>({
      query: () => '/parking-damages/urgent',
      providesTags: ['ParkingDamages'],
    }),

    getParkingDamage: builder.query<ParkingDamage, string>({
      query: (id) => `/parking-damages/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ParkingDamages', id }],
    }),

    getDamageHistory: builder.query<ParkingHistory[], string>({
      query: (id) => `/parking-damages/${id}/history`,
      providesTags: (_result, _error, id) => [{ type: 'DamageHistory', id }],
    }),

    getDamageComments: builder.query<ParkingComment[], string>({
      query: (id) => `/parking-damages/${id}/comments`,
      providesTags: (_result, _error, id) => [{ type: 'DamageComments', id }],
    }),

    createParkingDamage: builder.mutation<ParkingDamage, CreateParkingDamageDto>({
      query: (body) => ({
        url: '/parking-damages',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ParkingDamages'],
    }),

    resolveParkingDamage: builder.mutation<ParkingDamage, { id: string; data: ResolveDamageDto }>({
      query: ({ id, data }) => ({
        url: `/parking-damages/${id}/resolve`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['ParkingDamages', 'DamageHistory'],
    }),

    addDamageComment: builder.mutation<ParkingComment, { damageId: string; data: CreateCommentDto }>({
      query: ({ damageId, data }) => ({
        url: `/parking-damages/${damageId}/comments`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { damageId }) => [{ type: 'DamageComments', id: damageId }],
    }),

    deleteParkingDamage: builder.mutation<void, string>({
      query: (id) => ({
        url: `/parking-damages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ParkingDamages'],
    }),

    // Cash Collections
    getCashCollections: builder.query<CashCollection[], {
      parkingLotIds?: string[];
      paymentMachineIds?: string[];
      startDate?: string;
      endDate?: string;
    } | void>({
      query: (filters) => ({
        url: '/cash-collections',
        params: filters ? {
          parkingLotIds: filters.parkingLotIds?.join(','),
          paymentMachineIds: filters.paymentMachineIds?.join(','),
          startDate: filters.startDate,
          endDate: filters.endDate,
        } : undefined,
      }),
      providesTags: ['CashCollections'],
    }),

    getCashCollectionTotals: builder.query<CashCollectionTotals, {
      parkingLotIds?: string[];
      paymentMachineIds?: string[];
      startDate?: string;
      endDate?: string;
    } | void>({
      query: (filters) => ({
        url: '/cash-collections/totals',
        params: filters ? {
          parkingLotIds: filters.parkingLotIds?.join(','),
          paymentMachineIds: filters.paymentMachineIds?.join(','),
          startDate: filters.startDate,
          endDate: filters.endDate,
        } : undefined,
      }),
      providesTags: ['CashCollections'],
    }),

    createCashCollection: builder.mutation<CashCollection, CreateCashCollectionDto>({
      query: (body) => ({
        url: '/cash-collections',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CashCollections'],
    }),

    deleteCashCollection: builder.mutation<void, string>({
      query: (id) => ({
        url: `/cash-collections/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CashCollections'],
    }),

    // Edit Requests
    getEditRequests: builder.query<EditRequest[], EditRequestStatus | void>({
      query: (status) => ({
        url: '/edit-requests',
        params: status ? { status } : undefined,
      }),
      providesTags: ['EditRequests'],
    }),

    getPendingEditRequests: builder.query<EditRequest[], void>({
      query: () => '/edit-requests/pending',
      providesTags: ['EditRequests'],
    }),

    getPendingEditRequestsCount: builder.query<{ count: number }, void>({
      query: () => '/edit-requests/pending/count',
      providesTags: ['EditRequests'],
    }),

    getMyEditRequests: builder.query<EditRequest[], void>({
      query: () => '/edit-requests/my-requests',
      providesTags: ['EditRequests'],
    }),

    getEditRequest: builder.query<EditRequest, string>({
      query: (id) => `/edit-requests/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'EditRequests', id }],
    }),

    createEditRequest: builder.mutation<EditRequest, CreateEditRequestDto>({
      query: (body) => ({
        url: '/edit-requests',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EditRequests', 'ParkingIssues', 'ParkingDamages', 'CashCollections'],
    }),

    reviewEditRequest: builder.mutation<EditRequest, { id: string; data: ReviewEditRequestDto }>({
      query: ({ id, data }) => ({
        url: `/edit-requests/${id}/review`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['EditRequests', 'ParkingIssues', 'ParkingDamages', 'CashCollections'],
    }),
  }),
});

export const {
  // Parking Lots
  useGetParkingLotsQuery,
  useGetParkingLotQuery,
  useGetPaymentMachinesQuery,
  // Constants
  useGetEquipmentListQuery,
  useGetDamageEquipmentListQuery,
  useGetCompanyListQuery,
  // Parking Issues
  useGetParkingIssuesQuery,
  useGetUrgentIssuesQuery,
  useGetMyAssignedIssuesQuery,
  useGetParkingIssueQuery,
  useGetIssueHistoryQuery,
  useGetIssueCommentsQuery,
  useCreateParkingIssueMutation,
  useUpdateParkingIssueMutation,
  useResolveParkingIssueMutation,
  useAddIssueCommentMutation,
  useDeleteParkingIssueMutation,
  // Parking Damages
  useGetParkingDamagesQuery,
  useGetUrgentDamagesQuery,
  useGetParkingDamageQuery,
  useGetDamageHistoryQuery,
  useGetDamageCommentsQuery,
  useCreateParkingDamageMutation,
  useResolveParkingDamageMutation,
  useAddDamageCommentMutation,
  useDeleteParkingDamageMutation,
  // Cash Collections
  useGetCashCollectionsQuery,
  useGetCashCollectionTotalsQuery,
  useCreateCashCollectionMutation,
  useDeleteCashCollectionMutation,
  // Edit Requests
  useGetEditRequestsQuery,
  useGetPendingEditRequestsQuery,
  useGetPendingEditRequestsCountQuery,
  useGetMyEditRequestsQuery,
  useGetEditRequestQuery,
  useCreateEditRequestMutation,
  useReviewEditRequestMutation,
} = parkingApi;
