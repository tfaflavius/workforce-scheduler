export interface OvertimeDayEntry {
  date: string; // YYYY-MM-DD
  userId: string;
  userName: string;
  plannedHours: number; // from ScheduleAssignment
  actualHours: number; // from TimeEntry
  overtimeHours: number; // actual - planned (can be negative = undertime)
  isApproved: boolean; // if all TimeEntries are APPROVED
  notes: string;
}

export interface OvertimeWeeklySummary {
  weekNumber: number;
  userId: string;
  userName: string;
  plannedHours: number;
  actualHours: number;
  overtimeHours: number;
  daysWithOvertime: number;
}

export interface OvertimeMonthlySummary {
  month: string; // YYYY-MM
  userId: string;
  userName: string;
  departmentName: string;
  totalPlannedHours: number;
  totalActualHours: number;
  totalOvertimeHours: number;
  weeklySummaries: OvertimeWeeklySummary[];
  dailyEntries: OvertimeDayEntry[];
}

export interface OvertimeReportFilters {
  monthYear?: string; // YYYY-MM format
  userId?: string; // filter by specific user
  departmentId?: string;
  format?: 'PDF' | 'EXCEL';
}

export interface OvertimeReportResponse {
  reportId: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  expiresAt: string;
  summary: {
    totalEmployees: number;
    totalOvertimeHours: number;
    averageOvertimePerEmployee: number;
  };
}
