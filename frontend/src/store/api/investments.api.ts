import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthBaseQuery } from './baseQuery';

export interface InvestmentDocumentMetadata {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentAnnualBudgetSummary {
  year: number;
  totalAmount: number;
  allocatedToPositions: number;
  spentOnAcquisitions: number;
  remainingInPositions: number;
  availableForNewPositions: number;
  notes: string | null;
  lastModifiedBy: { id: string; fullName: string } | null;
  updatedAt: string | null;
}

export interface UpsertAnnualBudgetDto {
  year: number;
  totalAmount: number;
  notes?: string;
}

export const investmentsApi = createApi({
  reducerPath: 'investmentsApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['InvestmentDocument', 'InvestmentAnnualBudget'],
  endpoints: (builder) => ({
    getInvestmentDocument: builder.query<InvestmentDocumentMetadata | null, void>({
      query: () => '/investments/document',
      providesTags: [{ type: 'InvestmentDocument', id: 'CURRENT' }],
    }),

    /**
     * Returns the raw Excel bytes as an ArrayBuffer for in-app rendering with SheetJS.
     * NOT a JSON endpoint — uses responseHandler to grab the binary stream.
     */
    getInvestmentDocumentFile: builder.query<ArrayBuffer, void>({
      query: () => ({
        url: '/investments/document/file',
        responseHandler: (response: Response) => response.arrayBuffer(),
        cache: 'no-cache',
      }),
      providesTags: [{ type: 'InvestmentDocument', id: 'CURRENT-FILE' }],
    }),

    uploadInvestmentDocument: builder.mutation<InvestmentDocumentMetadata, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/investments/document/upload',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: [
        { type: 'InvestmentDocument', id: 'CURRENT' },
        { type: 'InvestmentDocument', id: 'CURRENT-FILE' },
      ],
    }),

    /**
     * Annual investment envelope summary (the user-set total + breakdowns
     * computed live from budget positions and acquisitions).
     */
    getInvestmentAnnualBudget: builder.query<InvestmentAnnualBudgetSummary, number | void>({
      query: (year) => ({
        url: '/investments/annual-budget',
        params: year ? { year } : undefined,
      }),
      providesTags: (_r, _e, year) => [
        { type: 'InvestmentAnnualBudget', id: year ?? 'CURRENT' },
      ],
    }),

    upsertInvestmentAnnualBudget: builder.mutation<InvestmentAnnualBudgetSummary, UpsertAnnualBudgetDto>({
      query: (body) => ({
        url: '/investments/annual-budget',
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, dto) => [
        { type: 'InvestmentAnnualBudget', id: dto.year },
        { type: 'InvestmentAnnualBudget', id: 'CURRENT' },
      ],
    }),
  }),
});

export const {
  useGetInvestmentDocumentQuery,
  useGetInvestmentDocumentFileQuery,
  useUploadInvestmentDocumentMutation,
  useGetInvestmentAnnualBudgetQuery,
  useUpsertInvestmentAnnualBudgetMutation,
} = investmentsApi;
