// Budget categories
export type BudgetCategory = 'INVESTMENTS' | 'CURRENT_EXPENSES';

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  INVESTMENTS: 'Investitii',
  CURRENT_EXPENSES: 'Cheltuieli Curente',
};

// Monthly schedule item for service contracts
export interface MonthlyScheduleItem {
  monthNumber: number;
  date: string;
  expectedAmount: number;
  invoice: AcquisitionInvoice | null;
  status: 'INVOICED' | 'PENDING';
}

// Acquisition Invoice
export interface AcquisitionInvoice {
  id: string;
  acquisitionId: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  monthNumber: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Acquisition
export interface Acquisition {
  id: string;
  budgetPositionId: string;
  name: string;
  value: number;
  isFullPurchase: boolean;
  referat: string | null;
  caietDeSarcini: string | null;
  notaJustificativa: string | null;
  contractNumber: string | null;
  contractDate: string | null;
  ordinIncepere: string | null;
  procesVerbalReceptie: string | null;
  isServiceContract: boolean;
  serviceMonths: number | null;
  serviceStartDate: string | null;
  receptionDay: number | null;
  notes: string | null;
  invoices: AcquisitionInvoice[];
  // Calculated fields
  invoicedAmount: number;
  remainingAmount: number;
  monthlySchedule: MonthlyScheduleItem[];
  createdAt: string;
  updatedAt: string;
}

// Budget Position
export interface BudgetPosition {
  id: string;
  year: number;
  category: BudgetCategory;
  name: string;
  totalAmount: number;
  description: string | null;
  acquisitions: Acquisition[];
  // Calculated fields
  spentAmount: number;
  remainingAmount: number;
  createdAt: string;
  updatedAt: string;
}

// Summary
export interface AcquisitionsSummary {
  year: number;
  investments: CategorySummary;
  currentExpenses: CategorySummary;
  total: CategorySummary;
}

export interface CategorySummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  count: number;
}

// DTOs
export interface CreateBudgetPositionDto {
  year: number;
  category: BudgetCategory;
  name: string;
  totalAmount: number;
  description?: string;
}

export interface UpdateBudgetPositionDto {
  year?: number;
  category?: BudgetCategory;
  name?: string;
  totalAmount?: number;
  description?: string;
}

export interface CreateAcquisitionDto {
  budgetPositionId: string;
  name: string;
  value: number;
  isFullPurchase?: boolean;
  referat?: string;
  caietDeSarcini?: string;
  notaJustificativa?: string;
  contractNumber?: string;
  contractDate?: string;
  ordinIncepere?: string;
  procesVerbalReceptie?: string;
  isServiceContract?: boolean;
  serviceMonths?: number;
  serviceStartDate?: string;
  receptionDay?: number;
  notes?: string;
}

export interface UpdateAcquisitionDto {
  name?: string;
  value?: number;
  isFullPurchase?: boolean;
  referat?: string;
  caietDeSarcini?: string;
  notaJustificativa?: string;
  contractNumber?: string;
  contractDate?: string;
  ordinIncepere?: string;
  procesVerbalReceptie?: string;
  isServiceContract?: boolean;
  serviceMonths?: number;
  serviceStartDate?: string;
  receptionDay?: number;
  notes?: string;
}

export interface CreateInvoiceDto {
  acquisitionId: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  monthNumber?: number;
  notes?: string;
}

export interface UpdateInvoiceDto {
  invoiceNumber?: string;
  invoiceDate?: string;
  amount?: number;
  monthNumber?: number;
  notes?: string;
}

// ===================== REVENUE / EXPENSES =====================

export interface RevenueCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyRevenueData {
  incasari: number;
  cheltuieli: number;
  notes: string | null;
  id: string;
}

export interface RevenueSummaryCategory {
  categoryId: string;
  categoryName: string;
  sortOrder: number;
  months: Record<number, MonthlyRevenueData>;
  totalIncasari: number;
  totalCheltuieli: number;
}

export interface RevenueSummary {
  year: number;
  categories: RevenueSummaryCategory[];
  monthTotals: Record<number, { incasari: number; cheltuieli: number }>;
  grandTotalIncasari: number;
  grandTotalCheltuieli: number;
}

export interface CreateRevenueCategoryDto {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateRevenueCategoryDto {
  name?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpsertMonthlyRevenueDto {
  revenueCategoryId: string;
  year: number;
  month: number;
  incasari: number;
  cheltuieli: number;
  notes?: string;
}
