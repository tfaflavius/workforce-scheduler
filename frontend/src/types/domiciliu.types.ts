import type { UserReference, ParkingComment } from './parking.types';

// Domiciliu Request Types
export type DomiciliuRequestType = 'APROBARE_LOC' | 'REVOCARE_LOC' | 'MODIFICARE_DATE';
export type DomiciliuRequestStatus = 'ACTIVE' | 'FINALIZAT';

export const DOMICILIU_REQUEST_TYPE_LABELS: Record<DomiciliuRequestType, string> = {
  APROBARE_LOC: 'Aprobare loc',
  REVOCARE_LOC: 'Revocare loc',
  MODIFICARE_DATE: 'Modificare date',
};

export const DOMICILIU_REQUEST_STATUS_LABELS: Record<DomiciliuRequestStatus, string> = {
  ACTIVE: 'Activ',
  FINALIZAT: 'Finalizat',
};

export interface DomiciliuRequest {
  id: string;
  requestType: DomiciliuRequestType;
  status: DomiciliuRequestStatus;
  location: string;
  googleMapsLink?: string;
  description: string;
  personName: string;
  cnp?: string;
  address: string;
  carPlate: string;
  carBrand?: string;
  phone?: string;
  email?: string;
  contractNumber?: string;
  createdBy: string;
  resolvedBy?: string;
  lastModifiedBy?: string;
  resolutionDescription?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  creator?: UserReference;
  resolver?: UserReference;
  lastModifier?: UserReference;
  comments?: DomiciliuRequestComment[];
}

export interface DomiciliuRequestComment extends ParkingComment {
  requestId: string;
}

export interface CreateDomiciliuRequestDto {
  requestType: DomiciliuRequestType;
  location: string;
  googleMapsLink?: string;
  description: string;
  personName: string;
  cnp?: string;
  address: string;
  carPlate: string;
  carBrand?: string;
  phone?: string;
  email?: string;
  contractNumber?: string;
}

export interface UpdateDomiciliuRequestDto {
  requestType?: DomiciliuRequestType;
  location?: string;
  googleMapsLink?: string;
  description?: string;
  personName?: string;
  cnp?: string;
  address?: string;
  carPlate?: string;
  carBrand?: string;
  phone?: string;
  email?: string;
  contractNumber?: string;
}

export interface ResolveDomiciliuRequestDto {
  resolutionDescription: string;
}

export interface DomiciliuReportFilters {
  startDate?: string;
  endDate?: string;
  status?: DomiciliuRequestStatus;
  type?: DomiciliuRequestType;
}
