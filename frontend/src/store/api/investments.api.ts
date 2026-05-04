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

export const investmentsApi = createApi({
  reducerPath: 'investmentsApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['InvestmentDocument'],
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
  }),
});

export const {
  useGetInvestmentDocumentQuery,
  useGetInvestmentDocumentFileQuery,
  useUploadInvestmentDocumentMutation,
} = investmentsApi;
