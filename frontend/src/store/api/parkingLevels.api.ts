import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export interface ParkingLevel {
  id: string;
  parkingName: string;
  parkingOrder: number;
  levelOrder: number;
  levelNumber: string | null;
  levelName: string | null;
  total: number;
  normal: number;
  handicap: number;
  mamaCopil: number;
  electric: number;
  rezervat: number;
  moto: number;
}

export interface ParkingLevelPayload {
  parkingName: string;
  parkingOrder?: number;
  levelOrder?: number;
  levelNumber?: string | null;
  levelName?: string | null;
  total?: number;
  normal?: number;
  handicap?: number;
  mamaCopil?: number;
  electric?: number;
  rezervat?: number;
  moto?: number;
}

export const parkingLevelsApi = createApi({
  reducerPath: 'parkingLevelsApi',
  baseQuery: createAuthBaseQuery('/parking-levels'),
  tagTypes: ['ParkingLevels'],
  endpoints: (builder) => ({
    getParkingLevels: builder.query<ParkingLevel[], void>({
      query: () => '',
      providesTags: ['ParkingLevels'],
    }),
    createParkingLevel: builder.mutation<ParkingLevel, ParkingLevelPayload>({
      query: (body) => ({ url: '', method: 'POST', body }),
      invalidatesTags: ['ParkingLevels'],
    }),
    updateParkingLevel: builder.mutation<ParkingLevel, { id: string; data: ParkingLevelPayload }>({
      query: ({ id, data }) => ({ url: `/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['ParkingLevels'],
    }),
    deleteParkingLevel: builder.mutation<{ deleted: true }, string>({
      query: (id) => ({ url: `/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ParkingLevels'],
    }),
  }),
});

export const {
  useGetParkingLevelsQuery,
  useCreateParkingLevelMutation,
  useUpdateParkingLevelMutation,
  useDeleteParkingLevelMutation,
} = parkingLevelsApi;
