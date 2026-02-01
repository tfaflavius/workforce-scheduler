export type ShiftSwapStatus =
  | 'PENDING'
  | 'AWAITING_ADMIN'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type SwapResponseType = 'ACCEPTED' | 'REJECTED';

export interface ShiftSwapResponse {
  id: string;
  swapRequestId: string;
  responderId: string;
  responder?: {
    id: string;
    fullName: string;
    email: string;
  };
  response: SwapResponseType;
  message: string | null;
  createdAt: string;
}

export interface ShiftSwapRequest {
  id: string;
  requesterId: string;
  requester?: {
    id: string;
    fullName: string;
    email: string;
  };
  requesterDate: string;
  requesterShiftType: string | null;
  targetDate: string;
  targetShiftType: string | null;
  reason: string;
  status: ShiftSwapStatus;
  approvedResponderId: string | null;
  approvedResponder?: {
    id: string;
    fullName: string;
    email: string;
  };
  adminId: string | null;
  admin?: {
    id: string;
    fullName: string;
    email: string;
  };
  adminNotes: string | null;
  responses?: ShiftSwapResponse[];
  createdAt: string;
  updatedAt: string;
}

// DTOs
export interface CreateSwapRequestDto {
  requesterDate: string;
  targetDate: string;
  reason: string;
}

export interface RespondSwapDto {
  response: SwapResponseType;
  message?: string;
}

export interface AdminApproveSwapDto {
  approvedResponderId: string;
  adminNotes?: string;
}

export interface AdminRejectSwapDto {
  adminNotes?: string;
}

export interface UserOnDate {
  id: string;
  fullName: string;
  email: string;
  shiftNotes?: string;
}
