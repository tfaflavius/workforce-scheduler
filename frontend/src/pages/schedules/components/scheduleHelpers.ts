// Shared types and helper functions for schedule components

export type ShiftFilter = 'ALL' | '12H' | '8H' | 'VACATION' | 'FREE';
export type DayFilter = 'ALL' | string;
export type WorkPositionFilter = 'ALL' | string;

export interface AssignmentInfo {
  shiftId: string;
  notes: string;
  workPosition?: {
    shortName?: string;
    name?: string;
    color?: string;
  };
  isApprovedLeave?: boolean;
}

export interface CalendarDay {
  day: number;
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
}

export interface UserAssignmentsData {
  assignments: Record<string, AssignmentInfo[]>;
  scheduleId?: string;
  status?: string;
}

export interface ShiftInfo {
  label: string;
  color: string;
  type: '12H' | '8H' | 'VACATION' | 'FREE';
}

export interface MonthOption {
  value: string;
  label: string;
}

export interface WorkPosition {
  id: string;
  name: string;
  shortName?: string;
  color?: string;
}

export interface Department {
  id: string;
  name: string;
}

// Generate list of months for the current year (all 12 months)
export const generateMonthOptions = (): MonthOption[] => {
  const options: MonthOption[] = [];
  const year = new Date().getFullYear();

  for (let month = 0; month < 12; month++) {
    const date = new Date(year, month, 1);
    const value = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
    });
    options.push({ value, label });
  }

  return options;
};

// Get shift info from assignment notes
export const getExistingShiftInfo = (notes: string): ShiftInfo => {
  // Check for leave (concediu) - can be "Concediu" or "Concediu: Concediu de Odihna" etc.
  if (notes === 'Concediu' || notes?.startsWith('Concediu:') || notes?.includes('Concediu')) {
    return { label: 'CO', color: '#FF9800', type: 'VACATION' as const };
  }
  if (notes.includes('07:00-19:00')) {
    return { label: 'Z', color: '#4CAF50', type: '12H' as const };
  }
  if (notes.includes('19:00-07:00')) {
    return { label: 'N', color: '#3F51B5', type: '12H' as const };
  }
  if (notes.includes('07:30-15:30')) {
    return { label: 'Z3', color: '#795548', type: '8H' as const };
  }
  if (notes.includes('09:00-17:00')) {
    return { label: 'Z4', color: '#009688', type: '8H' as const };
  }
  if (notes.includes('08:00-16:00')) {
    return { label: 'Z5', color: '#FF5722', type: '8H' as const };
  }
  if (notes.includes('13:00-21:00')) {
    return { label: 'Z6', color: '#673AB7', type: '8H' as const };
  }
  if (notes.includes('06:00-14:00')) {
    return { label: 'Z1', color: '#00BCD4', type: '8H' as const };
  }
  if (notes.includes('14:00-22:00')) {
    return { label: 'Z2', color: '#9C27B0', type: '8H' as const };
  }
  if (notes.includes('22:00-06:00')) {
    return { label: 'N8', color: '#E91E63', type: '8H' as const };
  }
  return { label: '-', color: '#9E9E9E', type: 'FREE' as const };
};
