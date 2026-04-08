// ===== STATUS TYPES =====

export type PvSessionStatus = 'DRAFT' | 'READY' | 'IN_PROGRESS' | 'COMPLETED';
export type PvDayStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

// ===== LABELS =====

export const PV_SESSION_STATUS_LABELS: Record<PvSessionStatus, string> = {
  DRAFT: 'Nefinalizat',
  READY: 'Pregatit',
  IN_PROGRESS: 'In Desfasurare',
  COMPLETED: 'Finalizat',
};

export const PV_DAY_STATUS_LABELS: Record<PvDayStatus, string> = {
  OPEN: 'Disponibil',
  ASSIGNED: 'Asignat',
  IN_PROGRESS: 'In Desfasurare',
  COMPLETED: 'Finalizat',
};

// ===== COLORS =====

export const PV_SESSION_STATUS_COLORS: Record<PvSessionStatus, string> = {
  DRAFT: '#f59e0b',
  READY: '#3b82f6',
  IN_PROGRESS: '#8b5cf6',
  COMPLETED: '#10b981',
};

export const PV_DAY_STATUS_COLORS: Record<PvDayStatus, string> = {
  OPEN: '#f59e0b',
  ASSIGNED: '#3b82f6',
  IN_PROGRESS: '#8b5cf6',
  COMPLETED: '#10b981',
};

// ===== USER (minimal) =====

export interface PvUser {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  department?: {
    id: string;
    name: string;
  };
}

// ===== DAY =====

export interface PvSigningDay {
  id: string;
  sessionId: string;
  status: PvDayStatus;
  signingDate: string;
  dayOrder: number;
  noticeCount: number;
  firstNoticeSeries?: string;
  firstNoticeNumber?: string;
  lastNoticeSeries?: string;
  lastNoticeNumber?: string;
  noticesDateFrom?: string;
  noticesDateTo?: string;
  maintenanceUser1Id?: string;
  maintenanceUser1ClaimedAt?: string;
  maintenanceUser1?: PvUser;
  maintenanceUser2Id?: string;
  maintenanceUser2ClaimedAt?: string;
  maintenanceUser2?: PvUser;
  completionObservations?: string;
  completedAt?: string;
  completedBy?: string;
  completedByUser?: PvUser;
  createdAt: string;
  updatedAt: string;
  session?: PvSigningSession;
}

// ===== SESSION =====

export interface PvSigningSession {
  id: string;
  status: PvSessionStatus;
  monthYear: string;
  description?: string;
  createdBy: string;
  lastModifiedBy?: string;
  creator?: PvUser;
  lastModifier?: PvUser;
  days?: PvSigningDay[];
  comments?: PvSigningSessionComment[];
  createdAt: string;
  updatedAt: string;
}

// ===== COMMENT =====

export interface PvSigningSessionComment {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  user?: PvUser;
  createdAt: string;
  updatedAt: string;
}

// ===== DTOs =====

export interface PvSigningDayDto {
  signingDate: string;
  dayOrder: number;
  noticeCount: number;
  firstNoticeSeries?: string;
  firstNoticeNumber?: string;
  lastNoticeSeries?: string;
  lastNoticeNumber?: string;
  noticesDateFrom?: string;
  noticesDateTo?: string;
}

export interface CreatePvSigningSessionDto {
  monthYear: string;
  description?: string;
  days: PvSigningDayDto[];
}

export interface UpdatePvSigningSessionDto {
  description?: string;
  monthYear?: string;
  days?: PvSigningDayDto[];
}

export interface CompletePvSigningDayDto {
  observations?: string;
}

export interface AdminAssignPvSigningDayDto {
  userId: string;
  slot: '1' | '2';
}

// ===== HISTORY (reuse parking type) =====

export interface PvHistory {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  changes?: Record<string, any>;
  createdAt: string;
  user?: PvUser;
}
