// Parking Lot Types
export interface ParkingLot {
  id: string;
  name: string;
  code: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  paymentMachines?: PaymentMachine[];
}

export interface PaymentMachine {
  id: string;
  parkingLotId: string;
  machineNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parkingLot?: ParkingLot;
}

// User reference for display
export interface UserReference {
  id: string;
  fullName: string;
  email: string;
}

// Comment Types
export interface ParkingComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: UserReference;
}

export interface CreateCommentDto {
  content: string;
}

// History Types
export type ParkingHistoryAction = 'CREATED' | 'UPDATED' | 'RESOLVED' | 'DELETED';
export type ParkingHistoryEntityType = 'ISSUE' | 'DAMAGE' | 'COLLECTION';

export interface ParkingHistory {
  id: string;
  entityType: ParkingHistoryEntityType;
  entityId: string;
  action: ParkingHistoryAction;
  userId: string;
  changes?: Record<string, any>;
  createdAt: string;
  user?: UserReference;
}

export const HISTORY_ACTION_LABELS: Record<ParkingHistoryAction, string> = {
  CREATED: 'Creat',
  UPDATED: 'Modificat',
  RESOLVED: 'Finalizat',
  DELETED: 'Sters',
};

// Parking Issue Types
export type ParkingIssueStatus = 'ACTIVE' | 'FINALIZAT';

export interface ParkingIssue {
  id: string;
  parkingLotId: string;
  equipment: string;
  contactedCompany: string;
  description: string;
  status: ParkingIssueStatus;
  resolutionDescription?: string;
  createdBy: string;
  assignedTo?: string;
  resolvedBy?: string;
  lastModifiedBy?: string;
  isUrgent: boolean;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  parkingLot?: ParkingLot;
  creator?: UserReference;
  assignee?: UserReference;
  resolver?: UserReference;
  lastModifier?: UserReference;
  comments?: ParkingComment[];
}

export interface CreateParkingIssueDto {
  parkingLotId: string;
  equipment: string;
  contactedCompany: string;
  description: string;
}

export interface UpdateParkingIssueDto {
  equipment?: string;
  contactedCompany?: string;
  description?: string;
}

export interface ResolveIssueDto {
  resolutionDescription: string;
}

// Parking Damage Types
export type ParkingDamageStatus = 'ACTIVE' | 'FINALIZAT';
export type DamageResolutionType = 'RECUPERAT' | 'TRIMIS_JURIDIC';

export interface ParkingDamage {
  id: string;
  parkingLotId: string;
  damagedEquipment: string;
  personName: string;
  phone: string;
  carPlate: string;
  description: string;
  signatureData?: string;
  status: ParkingDamageStatus;
  resolutionType?: DamageResolutionType;
  resolutionDescription?: string;
  createdBy: string;
  resolvedBy?: string;
  lastModifiedBy?: string;
  isUrgent: boolean;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  parkingLot?: ParkingLot;
  creator?: UserReference;
  resolver?: UserReference;
  lastModifier?: UserReference;
  comments?: ParkingComment[];
}

export interface CreateParkingDamageDto {
  parkingLotId: string;
  damagedEquipment: string;
  personName: string;
  phone: string;
  carPlate: string;
  description: string;
  signatureData?: string;
}

export interface ResolveDamageDto {
  resolutionType: DamageResolutionType;
  resolutionDescription: string;
}

// Cash Collection Types
export interface CashCollection {
  id: string;
  parkingLotId: string;
  paymentMachineId: string;
  amount: number;
  collectedBy: string;
  collectedAt: string;
  notes?: string;
  createdAt: string;
  parkingLot?: ParkingLot;
  paymentMachine?: PaymentMachine;
  collector?: UserReference;
}

export interface CreateCashCollectionDto {
  parkingLotId: string;
  paymentMachineId: string;
  amount: number;
  notes?: string;
}

export interface CashCollectionTotals {
  totalAmount: number;
  count: number;
  byParkingLot: {
    parkingLotId: string;
    parkingLotName: string;
    totalAmount: number;
    count: number;
  }[];
  byMachine: {
    paymentMachineId: string;
    machineNumber: string;
    parkingLotName: string;
    totalAmount: number;
    count: number;
  }[];
}

export interface CashCollectionFilters {
  parkingLotIds?: string[];
  paymentMachineIds?: string[];
  startDate?: string;
  endDate?: string;
}

// Resolution Type Labels
export const RESOLUTION_TYPE_LABELS: Record<DamageResolutionType, string> = {
  RECUPERAT: 'Recuperare prejudiciu',
  TRIMIS_JURIDIC: 'Trimis la Directia Juridica',
};

// Status Labels
export const ISSUE_STATUS_LABELS: Record<ParkingIssueStatus, string> = {
  ACTIVE: 'Activ',
  FINALIZAT: 'Finalizat',
};

export const DAMAGE_STATUS_LABELS: Record<ParkingDamageStatus, string> = {
  ACTIVE: 'Activ',
  FINALIZAT: 'Finalizat',
};

// Edit Request Types
export type EditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type EditRequestType = 'PARKING_ISSUE' | 'PARKING_DAMAGE' | 'CASH_COLLECTION';

export interface EditRequest {
  id: string;
  requestType: EditRequestType;
  entityId: string;
  proposedChanges: Record<string, { from: any; to: any }>;
  originalData: Record<string, any>;
  status: EditRequestStatus;
  reason?: string;
  rejectionReason?: string;
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  requester?: UserReference;
  reviewer?: UserReference;
}

export interface CreateEditRequestDto {
  requestType: EditRequestType;
  entityId: string;
  proposedChanges: Record<string, any>;
  reason?: string;
}

export interface ReviewEditRequestDto {
  approved: boolean;
  rejectionReason?: string;
}

export const EDIT_REQUEST_STATUS_LABELS: Record<EditRequestStatus, string> = {
  PENDING: 'In asteptare',
  APPROVED: 'Aprobat',
  REJECTED: 'Respins',
};

export const EDIT_REQUEST_TYPE_LABELS: Record<EditRequestType, string> = {
  PARKING_ISSUE: 'Problema Parcare',
  PARKING_DAMAGE: 'Prejudiciu Parcare',
  CASH_COLLECTION: 'Ridicare Incasari',
};
