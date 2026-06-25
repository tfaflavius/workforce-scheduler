import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export interface MobileDeviceAssignedUser {
  id: string;
  fullName: string;
}

export const MOBILE_DEVICE_STATUSES = ['Functional', 'Defect', 'In reparatie', 'Casat'] as const;
export type MobileDeviceStatus = (typeof MOBILE_DEVICE_STATUSES)[number];

export interface MobileDevice {
  id: string;
  deviceType: string;
  model: string;
  serialImei: string | null;
  simOperator: string | null;
  simSerial: string | null;
  status: string;
  handoverDate: string | null;
  assignedUserId: string | null;
  assignedUser: MobileDeviceAssignedUser | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MobileDevicePayload {
  deviceType: string;
  model: string;
  serialImei?: string | null;
  simOperator?: string | null;
  simSerial?: string | null;
  status?: string;
  handoverDate?: string | null;
  assignedUserId?: string | null;
  notes?: string | null;
}

export const mobileDevicesApi = createApi({
  reducerPath: 'mobileDevicesApi',
  baseQuery: createAuthBaseQuery('/mobile-devices'),
  tagTypes: ['MobileDevices'],
  endpoints: (builder) => ({
    getMobileDevices: builder.query<MobileDevice[], { search?: string } | void>({
      query: (args) => ({
        url: '',
        params: args && args.search ? { search: args.search } : undefined,
      }),
      providesTags: ['MobileDevices'],
    }),

    createMobileDevice: builder.mutation<MobileDevice, MobileDevicePayload>({
      query: (body) => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MobileDevices'],
    }),

    updateMobileDevice: builder.mutation<MobileDevice, { id: string; data: MobileDevicePayload }>({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['MobileDevices'],
    }),

    deleteMobileDevice: builder.mutation<{ deleted: true }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MobileDevices'],
    }),
  }),
});

export const {
  useGetMobileDevicesQuery,
  useCreateMobileDeviceMutation,
  useUpdateMobileDeviceMutation,
  useDeleteMobileDeviceMutation,
} = mobileDevicesApi;
