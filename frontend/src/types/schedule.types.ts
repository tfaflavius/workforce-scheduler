export interface ShiftType {
  id: string;
  name: string;
  shiftPattern: string; // SHIFT_8H or SHIFT_12H
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  durationHours: number;
  isNightShift: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface WorkPosition {
  id: string;
  name: string;
  shortName: string;
  color: string;
  icon: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSchedule {
  id: string;
  name: string;
  month: number;
  year: number;
  monthYear?: string; // YYYY-MM format (optional, computed)
  shiftPattern: string;
  status: ScheduleStatus;
  departmentId: string | null;
  createdBy: string;
  approvedByAdmin: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  assignments?: ScheduleAssignment[];
  laborLawValidation?: LaborLawValidation;
  department?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    fullName: string;
    email: string;
  };
  approver?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface ScheduleAssignment {
  id: string;
  scheduleId: string;
  userId: string;
  shiftTypeId: string;
  workPositionId?: string;
  shiftDate: string; // YYYY-MM-DD format
  durationHours: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  shiftType?: ShiftType;
  workPosition?: WorkPosition;
  schedule?: WorkSchedule;
}

export type ScheduleStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ACTIVE'
  | 'REJECTED';

export const ScheduleStatus = {
  DRAFT: 'DRAFT' as const,
  PENDING_APPROVAL: 'PENDING_APPROVAL' as const,
  APPROVED: 'APPROVED' as const,
  ACTIVE: 'ACTIVE' as const,
  REJECTED: 'REJECTED' as const,
};

export interface LaborLawValidation {
  isValid: boolean;
  violations: LaborLawViolation[];
  warnings: LaborLawViolation[];
  validatedAt: string;
}

export interface LaborLawViolation {
  type: string;
  severity: 'CRITICAL' | 'WARNING';
  message: string;
  userId?: string;
  affectedDates?: string[];
  details?: Record<string, any>;
}

// DTOs for API requests
export interface ScheduleAssignmentDto {
  userId: string;
  shiftTypeId: string;
  shiftDate: string; // YYYY-MM-DD format
  workPositionId?: string; // Position: Dispecerat, Control, etc.
  notes?: string;
}

export interface CreateScheduleRequest {
  monthYear: string; // YYYY-MM format
  departmentId?: string;
  assignments?: ScheduleAssignmentDto[];
  notes?: string;
  status?: ScheduleStatus; // Optional - for admin to set status directly
}

export interface UpdateScheduleRequest {
  assignments?: ScheduleAssignmentDto[];
  notes?: string;
  status?: string;
}

export interface SubmitScheduleRequest {
  notes?: string;
}

export interface ApproveScheduleRequest {
  notes?: string;
}

export interface RejectScheduleRequest {
  reason: string;
}

export interface CloneScheduleRequest {
  month: number;
  year: number;
  name?: string;
}

export interface ExportScheduleRequest {
  format: 'PDF' | 'EXCEL';
  includeViolations?: boolean;
  includeWeeklySummaries?: boolean;
  language?: string;
}

export interface ReportResponse {
  reportId: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  expiresAt: string;
}

// Query filters
export interface ScheduleFilters {
  monthYear?: string;
  status?: ScheduleStatus;
  departmentId?: string;
  createdById?: string;
}

// Calendar event type for FullCalendar
export interface ScheduleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    assignmentId: string;
    userId: string;
    userName: string;
    shiftTypeId: string;
    shiftTypeName: string;
    durationHours: number;
    isNightShift: boolean;
    workPositionId?: string;
    workPositionName?: string;
    workPositionColor?: string;
    notes?: string;
  };
}

// Helper type for weekly summary
export interface WeeklySummary {
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalHours: number;
  totalDays: number;
  violations: LaborLawViolation[];
  warnings: LaborLawViolation[];
}

// Helper type for user schedule summary
export interface UserScheduleSummary {
  userId: string;
  userName: string;
  totalAssignments: number;
  totalHours: number;
  nightShiftCount: number;
  dayShiftCount: number;
  weeklySummaries: WeeklySummary[];
  violations: LaborLawViolation[];
  warnings: LaborLawViolation[];
}
