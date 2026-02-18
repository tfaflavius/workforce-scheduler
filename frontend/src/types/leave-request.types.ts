export type LeaveType = 'VACATION' | 'MEDICAL' | 'BIRTHDAY' | 'SPECIAL' | 'EXTRA_DAYS';

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  userId: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    department?: {
      id: string;
      name: string;
    };
  };
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveRequestStatus;
  adminId?: string;
  admin?: {
    id: string;
    fullName: string;
  };
  adminMessage?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  userId: string;
  leaveType: LeaveType;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays?: number;
}

export interface CreateLeaveRequestDto {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface RespondLeaveRequestDto {
  status: 'APPROVED' | 'REJECTED';
  message?: string;
}

export interface UpdateLeaveBalanceDto {
  leaveType: LeaveType;
  totalDays: number;
  usedDays?: number;
}

export interface AdminEditLeaveRequestDto {
  leaveType?: LeaveType;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  VACATION: 'Concediu de Odihna',
  MEDICAL: 'Concediu Medical',
  BIRTHDAY: 'Concediu Zi de Nastere',
  SPECIAL: 'Concediu Special',
  EXTRA_DAYS: 'Zile Suplimentare',
};

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  PENDING: 'In Asteptare',
  APPROVED: 'Aprobat',
  REJECTED: 'Respins',
};
