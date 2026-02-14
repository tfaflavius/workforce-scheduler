import type { UserReference, ParkingComment } from './parking.types';

// Handicap Request Types
export type HandicapRequestType = 'AMPLASARE_PANOU' | 'REVOCARE_PANOU' | 'CREARE_MARCAJ';
export type HandicapRequestStatus = 'ACTIVE' | 'FINALIZAT';

export const HANDICAP_REQUEST_TYPE_LABELS: Record<HandicapRequestType, string> = {
  AMPLASARE_PANOU: 'Amplasare panou',
  REVOCARE_PANOU: 'Revocare panou',
  CREARE_MARCAJ: 'Creare marcaj',
};

export const HANDICAP_REQUEST_STATUS_LABELS: Record<HandicapRequestStatus, string> = {
  ACTIVE: 'Activ',
  FINALIZAT: 'Finalizat',
};

export interface HandicapRequest {
  id: string;
  requestType: HandicapRequestType;
  status: HandicapRequestStatus;
  location: string;
  googleMapsLink?: string;
  description: string;
  personName?: string;
  handicapCertificateNumber?: string;
  carPlate?: string;
  autoNumber?: string;
  phone?: string;
  cnp?: string; // Vizibil doar pentru Admin si departamentele Parcari Handicap/Domiciliu
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
  comments?: HandicapRequestComment[];
}

export interface HandicapRequestComment extends ParkingComment {
  requestId: string;
}

export interface CreateHandicapRequestDto {
  requestType: HandicapRequestType;
  location: string;
  googleMapsLink?: string;
  description: string;
  personName?: string;
  handicapCertificateNumber?: string;
  carPlate?: string;
  autoNumber?: string;
  phone?: string;
  cnp?: string;
}

export interface UpdateHandicapRequestDto {
  requestType?: HandicapRequestType;
  location?: string;
  googleMapsLink?: string;
  description?: string;
  personName?: string;
  handicapCertificateNumber?: string;
  carPlate?: string;
  autoNumber?: string;
  phone?: string;
  cnp?: string;
}

export interface ResolveHandicapRequestDto {
  resolutionDescription: string;
}

export interface HandicapReportFilters {
  startDate?: string;
  endDate?: string;
  status?: HandicapRequestStatus;
  type?: HandicapRequestType;
}

// ============== LEGITIMATII HANDICAP ==============

export type HandicapLegitimationStatus = 'ACTIVE' | 'FINALIZAT';

export const HANDICAP_LEGITIMATION_STATUS_LABELS: Record<HandicapLegitimationStatus, string> = {
  ACTIVE: 'Activ',
  FINALIZAT: 'Finalizat',
};

export interface HandicapLegitimation {
  id: string;
  status: HandicapLegitimationStatus;
  personName: string;
  cnp?: string;
  handicapCertificateNumber: string;
  carPlate: string;
  autoNumber?: string;
  phone?: string;
  description?: string;
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
  comments?: HandicapLegitimationComment[];
}

export interface HandicapLegitimationComment extends ParkingComment {
  legitimationId: string;
}

export interface CreateHandicapLegitimationDto {
  personName: string;
  cnp?: string;
  handicapCertificateNumber: string;
  carPlate: string;
  autoNumber?: string;
  phone?: string;
  description?: string;
}

export interface UpdateHandicapLegitimationDto {
  personName?: string;
  cnp?: string;
  handicapCertificateNumber?: string;
  carPlate?: string;
  autoNumber?: string;
  phone?: string;
  description?: string;
}

export interface ResolveHandicapLegitimationDto {
  resolutionDescription: string;
}

export interface HandicapLegitimationReportFilters {
  startDate?: string;
  endDate?: string;
  status?: HandicapLegitimationStatus;
}

// ============== LEGITIMATII REVOLUTIONAR/DEPORTAT ==============

export type RevolutionarLegitimationStatus = 'ACTIVE' | 'FINALIZAT';

export const REVOLUTIONAR_LEGITIMATION_STATUS_LABELS: Record<RevolutionarLegitimationStatus, string> = {
  ACTIVE: 'Activ',
  FINALIZAT: 'Finalizat',
};

export interface RevolutionarLegitimation {
  id: string;
  status: RevolutionarLegitimationStatus;
  personName: string;
  cnp?: string;
  lawNumber: string; // Lege / Hotarare in loc de certificat handicap
  carPlate: string;
  autoNumber?: string;
  phone?: string;
  description?: string;
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
  comments?: RevolutionarLegitimationComment[];
}

export interface RevolutionarLegitimationComment extends ParkingComment {
  legitimationId: string;
}

export interface CreateRevolutionarLegitimationDto {
  personName: string;
  cnp?: string;
  lawNumber: string;
  carPlate: string;
  autoNumber?: string;
  phone?: string;
  description?: string;
}

export interface UpdateRevolutionarLegitimationDto {
  personName?: string;
  cnp?: string;
  lawNumber?: string;
  carPlate?: string;
  autoNumber?: string;
  phone?: string;
  description?: string;
}

export interface ResolveRevolutionarLegitimationDto {
  resolutionDescription: string;
}

export interface RevolutionarLegitimationReportFilters {
  startDate?: string;
  endDate?: string;
  status?: RevolutionarLegitimationStatus;
}
