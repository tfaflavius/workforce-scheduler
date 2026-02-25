import type { UserReference, ParkingComment } from './parking.types';

// Control Sesizare Types
export type ControlSesizareType = 'MARCAJ' | 'PANOU';
export type ControlSesizareStatus = 'ACTIVE' | 'FINALIZAT';
export type ControlSesizareZone = 'ROSU' | 'GALBEN' | 'ALB';
export type ControlParkingLayoutType = 'PARALEL' | 'PERPENDICULAR' | 'SPIC';

export const CONTROL_SESIZARE_TYPE_LABELS: Record<ControlSesizareType, string> = {
  MARCAJ: 'Marcaj',
  PANOU: 'Panou',
};

export const CONTROL_SESIZARE_STATUS_LABELS: Record<ControlSesizareStatus, string> = {
  ACTIVE: 'Activ',
  FINALIZAT: 'Finalizat',
};

export const CONTROL_SESIZARE_ZONE_LABELS: Record<ControlSesizareZone, string> = {
  ROSU: 'Rosu',
  GALBEN: 'Galben',
  ALB: 'Alb',
};

export const CONTROL_PARKING_LAYOUT_LABELS: Record<ControlParkingLayoutType, string> = {
  PARALEL: 'Paralel',
  PERPENDICULAR: 'Perpendicular',
  SPIC: 'Spic',
};

// Zone color mapping
export const ZONE_COLORS: Record<ControlSesizareZone, { main: string; bg: string }> = {
  ROSU: { main: '#ef4444', bg: '#ef444415' },
  GALBEN: { main: '#f59e0b', bg: '#f59e0b15' },
  ALB: { main: '#64748b', bg: '#64748b15' },
};

export interface ControlSesizare {
  id: string;
  type: ControlSesizareType;
  status: ControlSesizareStatus;
  zone: ControlSesizareZone;
  orientation?: ControlParkingLayoutType;
  location: string;
  googleMapsLink?: string;
  description: string;
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
  comments?: ControlSesizareComment[];
}

export interface ControlSesizareComment extends ParkingComment {
  sesizareId: string;
}

export interface CreateControlSesizareDto {
  type: ControlSesizareType;
  zone: ControlSesizareZone;
  orientation?: ControlParkingLayoutType;
  location: string;
  googleMapsLink?: string;
  description: string;
}

export interface UpdateControlSesizareDto {
  zone?: ControlSesizareZone;
  orientation?: ControlParkingLayoutType;
  location?: string;
  googleMapsLink?: string;
  description?: string;
}

export interface ResolveControlSesizareDto {
  resolutionDescription: string;
}

export interface ControlSesizareReportFilters {
  startDate?: string;
  endDate?: string;
  status?: ControlSesizareStatus;
  type?: ControlSesizareType;
}
