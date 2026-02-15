export type DailyReportStatus = 'DRAFT' | 'SUBMITTED';

export interface DailyReport {
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
  date: string;
  content: string;
  status: DailyReportStatus;
  adminComment?: string;
  adminCommentedAt?: string;
  adminCommentedById?: string;
  adminCommentedBy?: {
    id: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateDailyReportDto {
  date?: string;
  content: string;
  status?: DailyReportStatus;
}

export interface UpdateDailyReportDto {
  content?: string;
  status?: DailyReportStatus;
}

export interface AdminCommentDto {
  comment: string;
}

export const DAILY_REPORT_STATUS_LABELS: Record<DailyReportStatus, string> = {
  DRAFT: 'Ciorna',
  SUBMITTED: 'Trimis',
};
