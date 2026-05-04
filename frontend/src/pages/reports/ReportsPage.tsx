import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  TextField,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Tabs,
  Tab,
  alpha,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  FilterList as FilterIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Assessment as ReportIcon,
  BeachAccess as LeaveIcon,
  SwapHoriz as SwapIcon,
  Summarize as TotalIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  LocalParking as ParkingIcon,
  Accessible as HandicapIcon,
  Home as HomeIcon,
  BarChart as StatsIcon,
  Receipt as PvIcon,
  Speed as ParcometreIcon,
  ShoppingCart as AchizitiiIcon,
  ReportProblem as SesizariIcon,
  AccountBalance as IncasariIcon,
  Fingerprint as PontajIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
// Lazy-loaded report tabs for better code splitting
const ParkingReportsTab = lazy(() => import('./ParkingReportsTab'));
const HandicapReportsTab = lazy(() => import('./HandicapReportsTab'));
const DomiciliuReportsTab = lazy(() => import('./DomiciliuReportsTab'));
const ParkingStatsReportsTab = lazy(() => import('./ParkingStatsReportsTab'));
const PvReportsTab = lazy(() => import('./PvReportsTab'));
const ParcometreReportsTab = lazy(() => import('./ParcometreReportsTab'));
const AchizitiiReportsTab = lazy(() => import('./AchizitiiReportsTab'));
const ControlSesizariReportsTab = lazy(() => import('./ControlSesizariReportsTab'));
const IncasariCheltuieliReportsTab = lazy(() => import('./IncasariCheltuieliReportsTab'));
const ControlNotesReportsTab = lazy(() => import('./ControlNotesReportsTab'));
const PontajReportsTab = lazy(() => import('./PontajReportsTab'));
import { GradientHeader, StatCard } from '../../components/common';
import { useAppSelector } from '../../store/hooks';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useGetAllLeaveRequestsQuery } from '../../store/api/leaveRequests.api';
import { useGetAllSwapRequestsQuery } from '../../store/api/shiftSwaps.api';
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '../../types/leave-request.types';
import type { LeaveType, LeaveRequestStatus } from '../../types/leave-request.types';
import type { ShiftSwapStatus } from '../../types/shift-swap.types';
import { loadPDFLibs, loadXLSXLib } from '../../utils/lazyExportLibs';
import { HANDICAP_DEPARTMENT_NAME, DOMICILIU_DEPARTMENT_NAME } from '../../constants/departments';
import { useGetPvSessionsQuery } from '../../store/api/pvDisplay.api';
import { useGetParkingMetersQuery, useGetParkingIssuesQuery, useGetParkingDamagesQuery } from '../../store/api/parking.api';
import { useGetControlSesizariQuery } from '../../store/api/control.api';
import { useGetHandicapRequestsQuery } from '../../store/api/handicap.api';
import { useGetDomiciliuRequestsQuery } from '../../store/api/domiciliu.api';
import { useGetBudgetPositionsQuery, useGetRevenueSummaryQuery } from '../../store/api/acquisitions.api';
import { useGetAdminTimeEntriesQuery } from '../../store/api/time-tracking.api';
import { useGetMonthlyTicketsSummaryQuery, useGetMonthlySubscriptionsQuery, useGetMonthlyOccupancySummaryQuery } from '../../store/api/parkingStats.api';
import { PARKING_STAT_LOCATIONS, PARKING_SUBSCRIPTION_LOCATIONS, getLocationFullName, TOTAL_PARKING_SPOTS } from '../../constants/parkingStats';
import { isAdminOrAbove } from '../../utils/roleHelpers';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  drawSectionHeader,
  drawStatCards,
  drawHorizontalBarChart,
  drawProgressBar,
  drawStatusDistributionBar,
  drawColoredDivider,
  type RGB,
} from '../../utils/pdfCharts';

// Genereaza lista de luni pentru anul curent (toate cele 12 luni)
const generateMonthOptions = () => {
  const options = [];
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

const SWAP_STATUS_LABELS: Record<ShiftSwapStatus, string> = {
  PENDING: 'In asteptare',
  AWAITING_ADMIN: 'Asteapta admin',
  APPROVED: 'Aprobat',
  REJECTED: 'Respins',
  CANCELLED: 'Anulat',
  EXPIRED: 'Expirat',
};

const REPORT_SECTIONS = [
  { key: 'workStats', label: 'Program de lucru' },
  { key: 'leaves', label: 'Concedii' },
  { key: 'swaps', label: 'Schimburi de tura' },
  { key: 'parkingEtajate', label: 'Parcari Etajate' },
  { key: 'parkingHandicap', label: 'Parcari Handicap' },
  { key: 'parkingDomiciliu', label: 'Parcari Domiciliu' },
  { key: 'pvSessions', label: 'Procese Verbale / Facturare' },
  { key: 'parcometre', label: 'Parcometre' },
  { key: 'controlSesizari', label: 'Control Sesizari' },
  { key: 'achizitii', label: 'Achizitii' },
  { key: 'incasariCheltuieli', label: 'Incasari / Cheltuieli' },
  { key: 'pontaj', label: 'Monitorizare Pontaj' },
  { key: 'parkingStats', label: 'Statistici Parcari' },
] as const;

const DEFAULT_SELECTED_SECTIONS: Record<string, boolean> = Object.fromEntries(
  REPORT_SECTIONS.map(s => [s.key, true]),
);

const ReportsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAppSelector((state) => state.auth);
  const { notifyError } = useSnackbar();
  const isAdminOrManager = isAdminOrAbove(user?.role) || user?.role === 'MANAGER';

  const [tabValue, setTabValue] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filtering state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedLeaveStatus, setSelectedLeaveStatus] = useState<string>('ALL');
  const [selectedSwapStatus, setSelectedSwapStatus] = useState<string>('ALL');

  // Parking reports date filters
  const [parkingStartDate, setParkingStartDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [parkingEndDate, setParkingEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Custom report dialog state
  const [customReportOpen, setCustomReportOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>(() => ({ ...DEFAULT_SELECTED_SECTIONS }));

  // Lista de luni (generata o singura data)
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const { data: schedules = [], isLoading: schedulesLoading } = useGetSchedulesQuery({
    monthYear: selectedMonth,
  });
  const { data: users = [] } = useGetUsersQuery({ isActive: true });
  const { data: leaveRequests = [], isLoading: leavesLoading } = useGetAllLeaveRequestsQuery();
  const { data: swapRequests = [], isLoading: swapsLoading } = useGetAllSwapRequestsQuery({});

  const isLoading = schedulesLoading || leavesLoading || swapsLoading;

  // Lazy-loaded data for Raport Total (tab 3) - only fetch when needed
  const shouldFetchTotalData = tabValue === 3;
  const { data: totalPvSessions = [] } = useGetPvSessionsQuery(undefined, { skip: !shouldFetchTotalData });
  const { data: totalParkingMeters = [] } = useGetParkingMetersQuery(undefined, { skip: !shouldFetchTotalData });
  const { data: totalControlSesizari = [] } = useGetControlSesizariQuery(undefined, { skip: !shouldFetchTotalData });
  const { data: totalHandicapRequests = [] } = useGetHandicapRequestsQuery(undefined, { skip: !shouldFetchTotalData });
  const { data: totalDomiciliuRequests = [] } = useGetDomiciliuRequestsQuery(undefined, { skip: !shouldFetchTotalData });
  const { data: totalParkingIssues = [] } = useGetParkingIssuesQuery(undefined, { skip: !shouldFetchTotalData });
  const { data: totalParkingDamages = [] } = useGetParkingDamagesQuery(undefined, { skip: !shouldFetchTotalData });
  const selectedYear = parseInt(selectedMonth.split('-')[0], 10) || new Date().getFullYear();
  const { data: totalBudgetPositions = [] } = useGetBudgetPositionsQuery({ year: selectedYear }, { skip: !shouldFetchTotalData });
  const { data: totalRevenueSummary } = useGetRevenueSummaryQuery({ year: selectedYear }, { skip: !shouldFetchTotalData });
  const { data: totalTimeEntries = [] } = useGetAdminTimeEntriesQuery(
    { startDate: parkingStartDate, endDate: parkingEndDate },
    { skip: !shouldFetchTotalData || !isAdminOrManager }
  );
  const { data: totalMonthlyTickets = [] } = useGetMonthlyTicketsSummaryQuery(selectedMonth, { skip: !shouldFetchTotalData });
  const { data: totalMonthlySubscriptions = [] } = useGetMonthlySubscriptionsQuery(selectedMonth, { skip: !shouldFetchTotalData });
  const { data: totalMonthlyOccupancy = [] } = useGetMonthlyOccupancySummaryQuery(selectedMonth, { skip: !shouldFetchTotalData });

  // Filtram doar angajatii si managerii
  const eligibleUsers = useMemo(() => {
    return users.filter(u => u.role === 'USER' || u.role === 'MANAGER');
  }, [users]);

  // Lista departamentelor unice
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    users.forEach(u => {
      if (u.departmentId) {
        deptSet.add(u.departmentId);
      }
    });
    return Array.from(deptSet);
  }, [users]);

  // Genereaza zilele lunii
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 0);
    return date.getDate();
  }, [selectedMonth]);

  const calendarDays = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      days.push({
        day,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayOfWeek: date.toLocaleDateString('ro-RO', { weekday: 'short' }),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }
    return days;
  }, [selectedMonth, daysInMonth]);

  // Calculeaza numarul de zile lucratoare din luna si norma de ore
  const workingDaysInMonth = useMemo(() => {
    return calendarDays.filter(d => !d.isWeekend).length;
  }, [calendarDays]);

  const monthlyHoursNorm = useMemo(() => {
    return workingDaysInMonth * 8; // 8 ore pe zi lucratoare
  }, [workingDaysInMonth]);

  // Creeaza un map cu toate asignarile existente pentru toti angajatii
  const allUsersAssignments = useMemo(() => {
    const userAssignmentsMap: Record<string, {
      assignments: Record<string, { shiftId: string; notes: string; workPosition?: { shortName?: string; name?: string; color?: string } }>;
      scheduleId?: string;
      status?: string;
    }> = {};

    schedules.forEach(schedule => {
      if (schedule.assignments) {
        schedule.assignments.forEach(assignment => {
          if (!userAssignmentsMap[assignment.userId]) {
            userAssignmentsMap[assignment.userId] = {
              assignments: {},
              scheduleId: schedule.id,
              status: schedule.status,
            };
          }
          // Normalizeaza data pentru a evita probleme cu timezone
          const normalizedDate = assignment.shiftDate.split('T')[0];
          userAssignmentsMap[assignment.userId].assignments[normalizedDate] = {
            shiftId: assignment.shiftTypeId,
            notes: assignment.notes || '',
            workPosition: assignment.workPosition ? {
              shortName: assignment.workPosition.shortName,
              name: assignment.workPosition.name,
              color: assignment.workPosition.color,
            } : undefined,
          };
          userAssignmentsMap[assignment.userId].scheduleId = schedule.id;
          userAssignmentsMap[assignment.userId].status = schedule.status;
        });
      }
    });

    return userAssignmentsMap;
  }, [schedules]);

  // Obtine info pentru o asignare existenta
  const getExistingShiftInfo = (notes: string) => {
    // Check for leave (can be "Concediu" or "Concediu: Concediu de Odihna" etc.)
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
      return { label: 'Z4', color: '#009688', type: '8H' as const };  // Teal
    }
    if (notes.includes('08:00-16:00')) {
      return { label: 'Z5', color: '#FF5722', type: '8H' as const };  // Deep Orange
    }
    if (notes.includes('13:00-21:00')) {
      return { label: 'Z6', color: '#673AB7', type: '8H' as const };  // Deep Purple
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

  // Filtrare utilizatori
  const filteredUsers = useMemo(() => {
    let filtered = [...eligibleUsers];

    // Filtru dupa nume
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(user =>
        user.fullName.toLowerCase().includes(query)
      );
    }

    // Filtru dupa departament
    if (selectedDepartment !== 'ALL') {
      filtered = filtered.filter(user => user.departmentId === selectedDepartment);
    }

    return filtered;
  }, [eligibleUsers, debouncedSearch, selectedDepartment]);

  // Filtrare concedii dupa luna selectata si status
  const filteredLeaveRequests = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    return leaveRequests.filter(req => {
      const startDate = new Date(req.startDate);
      const endDate = new Date(req.endDate);

      // Check if leave overlaps with selected month
      const overlapsMonth = startDate <= endOfMonth && endDate >= startOfMonth;

      // Filter by status
      const matchesStatus = selectedLeaveStatus === 'ALL' || req.status === selectedLeaveStatus;

      // Filter by search (user name)
      const matchesSearch = !debouncedSearch.trim() ||
        req.user?.fullName?.toLowerCase().includes(debouncedSearch.toLowerCase());

      // Filter by department
      const matchesDepartment = selectedDepartment === 'ALL' ||
        req.user?.department?.id === selectedDepartment;

      return overlapsMonth && matchesStatus && matchesSearch && matchesDepartment;
    });
  }, [leaveRequests, selectedMonth, selectedLeaveStatus, debouncedSearch, selectedDepartment]);

  // Filtrare schimburi de tura dupa luna selectata si status
  const filteredSwapRequests = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    return swapRequests.filter(req => {
      const requesterDate = new Date(req.requesterDate);
      const targetDate = new Date(req.targetDate);

      // Check if swap is in selected month
      const inMonth = (requesterDate >= startOfMonth && requesterDate <= endOfMonth) ||
        (targetDate >= startOfMonth && targetDate <= endOfMonth);

      // Filter by status
      const matchesStatus = selectedSwapStatus === 'ALL' || req.status === selectedSwapStatus;

      // Filter by search (user name)
      const matchesSearch = !debouncedSearch.trim() ||
        req.requester?.fullName?.toLowerCase().includes(debouncedSearch.toLowerCase());

      return inMonth && matchesStatus && matchesSearch;
    });
  }, [swapRequests, selectedMonth, selectedSwapStatus, debouncedSearch]);

  // Calculeaza totaluri pentru fiecare angajat
  const getUserStats = (userId: string) => {
    const userAssignments = allUsersAssignments[userId]?.assignments || {};
    const stats = {
      totalDays: 0,
      dayShifts: 0,
      nightShifts: 0,
      vacationDays: 0,
      freeDays: 0,
      totalHours: 0,
    };

    Object.values(userAssignments).forEach(assignment => {
      const shiftInfo = getExistingShiftInfo(assignment.notes);
      stats.totalDays++;

      if (shiftInfo.type === 'VACATION') {
        stats.vacationDays++;
      } else if (shiftInfo.type === '12H') {
        if (shiftInfo.label === 'Z') {
          stats.dayShifts++;
          stats.totalHours += 12;
        } else {
          stats.nightShifts++;
          stats.totalHours += 12;
        }
      } else if (shiftInfo.type === '8H') {
        if (shiftInfo.label === 'N8') {
          stats.nightShifts++;
          stats.totalHours += 8;
        } else {
          stats.dayShifts++;
          stats.totalHours += 8;
        }
      } else {
        stats.freeDays++;
      }
    });

    return stats;
  };

  // Calculate days between two dates (excluding weekends)
  const calculateWorkingDays = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }

    return count || 1;
  };

  // Mapare culori pentru ture (hex to RGB pentru PDF)
  const shiftColorMap: Record<string, [number, number, number]> = {
    'Z': [76, 175, 80],      // #4CAF50 - verde
    'N': [63, 81, 181],      // #3F51B5 - albastru
    'Z1': [0, 188, 212],     // #00BCD4 - cyan
    'Z2': [156, 39, 176],    // #9C27B0 - violet
    'Z3': [121, 85, 72],     // #795548 - maro
    'Z4': [0, 150, 136],     // #009688 - teal
    'Z5': [255, 87, 34],     // #FF5722 - deep orange
    'Z6': [103, 58, 183],    // #673AB7 - deep purple
    'N8': [233, 30, 99],     // #E91E63 - roz
    'CO': [255, 152, 0],     // #FF9800 - portocaliu
  };

  const leaveStatusColorMap: Record<LeaveRequestStatus, [number, number, number]> = {
    'PENDING': [255, 152, 0],   // Orange
    'APPROVED': [76, 175, 80],  // Green
    'REJECTED': [244, 67, 54],  // Red
  };

  const swapStatusColorMap: Record<ShiftSwapStatus, [number, number, number]> = {
    'PENDING': [255, 152, 0],
    'AWAITING_ADMIN': [33, 150, 243],
    'APPROVED': [76, 175, 80],
    'REJECTED': [244, 67, 54],
    'CANCELLED': [158, 158, 158],
    'EXPIRED': [121, 85, 72],
  };

  // ==================== EXPORT FUNCTIONS ====================

  // Export Work Schedule to PDF
  const handleExportSchedulePDF = async () => {
    const { jsPDF, autoTable } = await loadPDFLibs();
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3',
    });

    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    // Title
    doc.setFontSize(18);
    doc.text(`Raport Program de lucru - ${monthLabel}`, 14, 15);

    doc.setFontSize(10);
    doc.text(`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`, 14, 22);
    doc.text(`Total angajati: ${filteredUsers.length} | Zile lucratoare: ${workingDaysInMonth} | Norma lunara: ${monthlyHoursNorm} ore`, 14, 27);

    // Prepare table data - fiecare tura pe 2 linii (shift + workPosition)
    const headers = ['Angajat', ...calendarDays.map(d => `${d.day}`), 'Total ore', 'Norma', 'Diferenta', 'Ture zi', 'Ture noapte', 'CO'];
    const rows = filteredUsers.map(targetUser => {
      const userAssignments = allUsersAssignments[targetUser.id]?.assignments || {};
      const stats = getUserStats(targetUser.id);
      const difference = stats.totalHours - monthlyHoursNorm;
      const diffText = difference > 0 ? `+${difference}` : difference.toString();

      const row = [
        targetUser.fullName,
        ...calendarDays.map(d => {
          const assignment = userAssignments[d.date];
          if (assignment) {
            const shiftLabel = getExistingShiftInfo(assignment.notes).label;
            const workPosLabel = assignment.workPosition?.shortName || '';
            // Afiseaza tura + pozitie pe linii separate
            return workPosLabel ? `${shiftLabel}\n${workPosLabel}` : shiftLabel;
          }
          return '-';
        }),
        stats.totalHours.toString(),
        monthlyHoursNorm.toString(),
        diffText,
        stats.dayShifts.toString(),
        stats.nightShifts.toString(),
        stats.vacationDays.toString(),
      ];

      return row;
    });

    // Add table with colored cells
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 32,
      styles: {
        fontSize: 5,
        cellPadding: 0.5,
        halign: 'center',
        valign: 'middle',
        minCellHeight: 8,
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 5,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 35 },
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index > 0 && data.column.index <= calendarDays.length) {
          // Extrage doar eticheta turei (prima linie din celula)
          const cellText = data.cell.text[0] || '';
          const shiftLabel = cellText.split('\n')[0];
          const color = shiftColorMap[shiftLabel];
          if (color) {
            data.cell.styles.fillColor = color;
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Coloana "Diferenta" - colorata in functie de valoare
        const diffColumnIndex = calendarDays.length + 3; // Dupa zilele + Total ore + Norma
        if (data.section === 'body' && data.column.index === diffColumnIndex) {
          const cellText = data.cell.text[0] || '0';
          const diffValue = parseInt(cellText.replace('+', ''), 10);
          if (diffValue > 0) {
            // Ore suplimentare - rosu
            data.cell.styles.fillColor = [244, 67, 54];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          } else if (diffValue < 0) {
            // Sub norma - portocaliu/galben
            data.cell.styles.fillColor = [255, 152, 0];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          } else {
            // Exact norma - verde
            data.cell.styles.fillColor = [76, 175, 80];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.section === 'head' && data.column.index > 0 && data.column.index <= calendarDays.length) {
          const dayIndex = data.column.index - 1;
          if (calendarDays[dayIndex]?.isWeekend) {
            data.cell.styles.fillColor = [244, 67, 54];
          }
        }
      },
    });

    // Add legend
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Legenda:', 14, finalY + 8);
    doc.setFont('helvetica', 'normal');

    const legendItems = [
      { label: 'Z', text: 'Zi 12h (07-19)', color: shiftColorMap['Z'] },
      { label: 'N', text: 'Noapte 12h (19-07)', color: shiftColorMap['N'] },
      { label: 'Z1', text: '8h (06-14)', color: shiftColorMap['Z1'] },
      { label: 'Z2', text: '8h (14-22)', color: shiftColorMap['Z2'] },
      { label: 'Z3', text: '8h (07:30-15:30)', color: shiftColorMap['Z3'] },
      { label: 'Z4', text: '8h (09-17)', color: shiftColorMap['Z4'] },
      { label: 'Z5', text: '8h (08-16)', color: shiftColorMap['Z5'] },
      { label: 'Z6', text: '8h (13-21)', color: shiftColorMap['Z6'] },
      { label: 'N8', text: 'Noapte 8h (22-06)', color: shiftColorMap['N8'] },
      { label: 'CO', text: 'Concediu', color: shiftColorMap['CO'] },
    ];

    let xPos = 14;
    const yPos = finalY + 14;
    const boxWidth = 8;
    const boxHeight = 5;

    legendItems.forEach((item) => {
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(xPos, yPos - 3.5, boxWidth, boxHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, xPos + boxWidth / 2, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(` = ${item.text}`, xPos + boxWidth + 1, yPos);
      xPos += boxWidth + doc.getTextWidth(` = ${item.text}`) + 6;
    });

    // Adauga legenda pentru pozitii de lucru
    const yPosWorkPosition = yPos + 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Pozitii de lucru:', 14, yPosWorkPosition);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('DISP = Dispecerat | CTRL = Control (afisat sub tura)', 14, yPosWorkPosition + 5);

    // Adauga legenda pentru diferenta de ore
    const yPosDiff = yPosWorkPosition + 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Diferenta ore:', 14, yPosDiff);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Casute colorate pentru legenda diferenta
    doc.setFillColor(244, 67, 54); // Rosu
    doc.rect(14, yPosDiff + 2, 10, 4, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text(' = Ore suplimentare (+)', 25, yPosDiff + 5);

    doc.setFillColor(255, 152, 0); // Portocaliu
    doc.rect(80, yPosDiff + 2, 10, 4, 'F');
    doc.text(' = Sub norma (-)', 91, yPosDiff + 5);

    doc.setFillColor(76, 175, 80); // Verde
    doc.rect(140, yPosDiff + 2, 10, 4, 'F');
    doc.text(' = Conform normei (0)', 151, yPosDiff + 5);

    doc.save(`raport-program-${selectedMonth}.pdf`);
  };

  // Export Work Schedule to Excel
  const handleExportScheduleExcel = async () => {
    const XLSX = await loadXLSXLib();
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    const headers = ['Angajat', 'Rol', ...calendarDays.map(d => `${d.day} ${d.dayOfWeek}`), 'Total ore', 'Norma', 'Diferenta', 'Ture zi', 'Ture noapte', 'Concediu', 'Liber'];

    const rows = filteredUsers.map(targetUser => {
      const userAssignments = allUsersAssignments[targetUser.id]?.assignments || {};
      const stats = getUserStats(targetUser.id);
      const difference = stats.totalHours - monthlyHoursNorm;
      const diffText = difference > 0 ? `+${difference}` : difference.toString();

      return [
        targetUser.fullName,
        targetUser.role === 'MANAGER' ? 'Manager' : 'Angajat',
        ...calendarDays.map(d => {
          const assignment = userAssignments[d.date];
          if (assignment) {
            const shiftLabel = getExistingShiftInfo(assignment.notes).label;
            const workPosLabel = assignment.workPosition?.shortName || '';
            // Afiseaza tura + pozitie (ex: "Z/DISP" sau doar "Z")
            return workPosLabel ? `${shiftLabel}/${workPosLabel}` : shiftLabel;
          }
          return '-';
        }),
        stats.totalHours,
        monthlyHoursNorm,
        diffText,
        stats.dayShifts,
        stats.nightShifts,
        stats.vacationDays,
        stats.freeDays,
      ];
    });

    const wb = XLSX.utils.book_new();
    const wsData = [
      [`Raport Program de lucru - ${monthLabel}`],
      [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
      [`Total angajati: ${filteredUsers.length} | Zile lucratoare: ${workingDaysInMonth} | Norma lunara: ${monthlyHoursNorm} ore (8 ore/zi)`],
      [],
      headers,
      ...rows,
      [],
      ['Legenda ture:'],
      ['Z = Zi 12 ore (07:00-19:00)'],
      ['N = Noapte 12 ore (19:00-07:00)'],
      ['Z1 = Zi 8 ore (06:00-14:00)'],
      ['Z2 = Zi 8 ore (14:00-22:00)'],
      ['Z3 = Zi 8 ore (07:30-15:30)'],
      ['Z4 = Zi 8 ore (09:00-17:00)'],
      ['Z5 = Zi 8 ore (08:00-16:00)'],
      ['N8 = Noapte 8 ore (22:00-06:00)'],
      ['CO = Concediu'],
      [],
      ['Legenda pozitii de lucru:'],
      ['DISP = Dispecerat'],
      ['CTRL = Control'],
      ['Format: TURA/POZITIE (ex: Z/DISP = Zi 12h la Dispecerat)'],
      [],
      ['Legenda diferenta ore:'],
      ['Valoare pozitiva (+) = Ore suplimentare peste norma'],
      ['Valoare negativa (-) = Sub norma lunara'],
      ['Valoare zero (0) = Conform normei lunare'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [{ wch: 25 }, { wch: 10 }, ...calendarDays.map(() => ({ wch: 8 })), { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 }];
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Program');
    XLSX.writeFile(wb, `raport-program-${selectedMonth}.xlsx`);
  };

  // Export Leave Requests to PDF
  const handleExportLeavesPDF = async () => {
    const { jsPDF, autoTable } = await loadPDFLibs();
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    doc.setFontSize(18);
    doc.text(`Raport concedii - ${monthLabel}`, 14, 15);

    doc.setFontSize(10);
    doc.text(`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`, 14, 22);
    doc.text(`Total cereri: ${filteredLeaveRequests.length}`, 14, 27);

    // Summary stats
    const approved = filteredLeaveRequests.filter(r => r.status === 'APPROVED').length;
    const pending = filteredLeaveRequests.filter(r => r.status === 'PENDING').length;
    const rejected = filteredLeaveRequests.filter(r => r.status === 'REJECTED').length;
    const totalDays = filteredLeaveRequests
      .filter(r => r.status === 'APPROVED')
      .reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);

    doc.text(`Aprobate: ${approved} | In asteptare: ${pending} | Respinse: ${rejected} | Total zile aprobate: ${totalDays}`, 14, 32);

    const headers = ['Angajat', 'Departament', 'Tip concediu', 'Data de inceput', 'Data de sfarsit', 'Zile', 'Status', 'Motiv'];
    const rows = filteredLeaveRequests.map(req => [
      req.user?.fullName || 'N/A',
      req.user?.department?.name || 'N/A',
      LEAVE_TYPE_LABELS[req.leaveType],
      new Date(req.startDate).toLocaleDateString('ro-RO'),
      new Date(req.endDate).toLocaleDateString('ro-RO'),
      calculateWorkingDays(req.startDate, req.endDate).toString(),
      LEAVE_STATUS_LABELS[req.status],
      req.reason || '-',
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 38,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 35 },
        7: { cellWidth: 50 },
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 6) {
          const status = filteredLeaveRequests[data.row.index]?.status;
          if (status) {
            data.cell.styles.fillColor = leaveStatusColorMap[status];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    doc.save(`raport-concedii-${selectedMonth}.pdf`);
  };

  // Export Leave Requests to Excel
  const handleExportLeavesExcel = async () => {
    const XLSX = await loadXLSXLib();
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    const approved = filteredLeaveRequests.filter(r => r.status === 'APPROVED').length;
    const pending = filteredLeaveRequests.filter(r => r.status === 'PENDING').length;
    const rejected = filteredLeaveRequests.filter(r => r.status === 'REJECTED').length;
    const totalDays = filteredLeaveRequests
      .filter(r => r.status === 'APPROVED')
      .reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);

    const headers = ['Angajat', 'Departament', 'Tip concediu', 'Data de inceput', 'Data de sfarsit', 'Zile lucratoare', 'Status', 'Motiv', 'Mesaj admin'];
    const rows = filteredLeaveRequests.map(req => [
      req.user?.fullName || 'N/A',
      req.user?.department?.name || 'N/A',
      LEAVE_TYPE_LABELS[req.leaveType],
      new Date(req.startDate).toLocaleDateString('ro-RO'),
      new Date(req.endDate).toLocaleDateString('ro-RO'),
      calculateWorkingDays(req.startDate, req.endDate),
      LEAVE_STATUS_LABELS[req.status],
      req.reason || '-',
      req.adminMessage || '-',
    ]);

    const wb = XLSX.utils.book_new();
    const wsData = [
      [`Raport concedii - ${monthLabel}`],
      [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
      [],
      ['Sumar:'],
      [`Total cereri: ${filteredLeaveRequests.length}`],
      [`Aprobate: ${approved}`],
      [`In asteptare: ${pending}`],
      [`Respinse: ${rejected}`],
      [`Total zile aprobate: ${totalDays}`],
      [],
      headers,
      ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Concedii');
    XLSX.writeFile(wb, `raport-concedii-${selectedMonth}.xlsx`);
  };

  // Export Shift Swaps to PDF
  const handleExportSwapsPDF = async () => {
    const { jsPDF, autoTable } = await loadPDFLibs();
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    doc.setFontSize(18);
    doc.text(`Raport schimburi de tura - ${monthLabel}`, 14, 15);

    doc.setFontSize(10);
    doc.text(`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`, 14, 22);
    doc.text(`Total cereri: ${filteredSwapRequests.length}`, 14, 27);

    // Summary stats
    const approved = filteredSwapRequests.filter(r => r.status === 'APPROVED').length;
    const pending = filteredSwapRequests.filter(r => r.status === 'PENDING' || r.status === 'AWAITING_ADMIN').length;
    const rejected = filteredSwapRequests.filter(r => r.status === 'REJECTED').length;

    doc.text(`Aprobate: ${approved} | In asteptare: ${pending} | Respinse: ${rejected}`, 14, 32);

    const headers = ['Solicitant', 'Data solicitantului', 'Tura solicitantului', 'Data dorita', 'Tura dorita', 'Inlocuitor', 'Status', 'Motiv'];
    const rows = filteredSwapRequests.map(req => [
      req.requester?.fullName || 'N/A',
      new Date(req.requesterDate).toLocaleDateString('ro-RO'),
      req.requesterShiftType || '-',
      new Date(req.targetDate).toLocaleDateString('ro-RO'),
      req.targetShiftType || '-',
      req.approvedResponder?.fullName || '-',
      SWAP_STATUS_LABELS[req.status],
      req.reason || '-',
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 38,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        7: { cellWidth: 40 },
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 6) {
          const status = filteredSwapRequests[data.row.index]?.status;
          if (status && swapStatusColorMap[status]) {
            data.cell.styles.fillColor = swapStatusColorMap[status];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    doc.save(`raport-schimburi-${selectedMonth}.pdf`);
  };

  // Export Shift Swaps to Excel
  const handleExportSwapsExcel = async () => {
    const XLSX = await loadXLSXLib();
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    const approved = filteredSwapRequests.filter(r => r.status === 'APPROVED').length;
    const pending = filteredSwapRequests.filter(r => r.status === 'PENDING' || r.status === 'AWAITING_ADMIN').length;
    const rejected = filteredSwapRequests.filter(r => r.status === 'REJECTED').length;

    const headers = ['Solicitant', 'Data solicitantului', 'Tura solicitantului', 'Data dorita', 'Tura dorita', 'Inlocuitor aprobat', 'Status', 'Motiv', 'Nota admin'];
    const rows = filteredSwapRequests.map(req => [
      req.requester?.fullName || 'N/A',
      new Date(req.requesterDate).toLocaleDateString('ro-RO'),
      req.requesterShiftType || '-',
      new Date(req.targetDate).toLocaleDateString('ro-RO'),
      req.targetShiftType || '-',
      req.approvedResponder?.fullName || '-',
      SWAP_STATUS_LABELS[req.status],
      req.reason || '-',
      req.adminNotes || '-',
    ]);

    const wb = XLSX.utils.book_new();
    const wsData = [
      [`Raport schimburi de tura - ${monthLabel}`],
      [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
      [],
      ['Sumar:'],
      [`Total cereri: ${filteredSwapRequests.length}`],
      [`Aprobate: ${approved}`],
      [`In asteptare: ${pending}`],
      [`Respinse: ${rejected}`],
      [],
      headers,
      ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Schimburi');
    XLSX.writeFile(wb, `raport-schimburi-${selectedMonth}.xlsx`);
  };

  const handleExportCustomPDF = async () => {
    const { jsPDF, autoTable } = await loadPDFLibs();
    try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = 210; // A4 width in mm
    const selectedCount = Object.values(selectedSections).filter(Boolean).length;
    if (selectedCount === 0) return;

    const checkPageBreak = (yPosition: number, needed: number = 40) => {
      if (yPosition + needed > pageHeight - 20) { doc.addPage(); return 20; }
      return yPosition;
    };

    // Color palette
    const BLUE: RGB = [25, 118, 210];
    const GREEN: RGB = [76, 175, 80];
    const RED: RGB = [244, 67, 54];
    const ORANGE: RGB = [255, 152, 0];
    const INDIGO: RGB = [99, 102, 241];
    const VIOLET: RGB = [139, 92, 246];
    const TEAL: RGB = [0, 150, 136];
    const EMERALD: RGB = [5, 150, 105];

    // Title header
    doc.setFillColor(25, 118, 210);
    doc.roundedRect(14, 10, pageWidth - 28, 16, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`Raport personalizat - ${monthLabel}`, pageWidth / 2, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}  |  Sectiuni: ${selectedCount} din ${REPORT_SECTIONS.length}`, pageWidth / 2, 32, { align: 'center' });

    let yPos = 40;
    let sn = 0;

    // ─── 1. Program de lucru ───
    if (selectedSections.workStats) {
      sn++;
      yPos = checkPageBreak(yPos, 60);
      yPos = drawSectionHeader(doc, 'Program de lucru', 14, yPos, pageWidth, BLUE, sn);
      const totalHours = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).totalHours, 0);
      const totalDayShifts = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).dayShifts, 0);
      const totalNightShifts = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).nightShifts, 0);
      const totalVacationDays = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).vacationDays, 0);
      yPos = drawStatCards(doc, [
        { label: 'Total Angajati', value: filteredUsers.length, color: BLUE },
        { label: 'Ore Lucrate', value: totalHours, color: GREEN },
        { label: 'Ture de Zi', value: totalDayShifts, color: ORANGE },
        { label: 'Ture de Noapte', value: totalNightShifts, color: INDIGO },
      ], 14, yPos, pageWidth, checkPageBreak);
      yPos = drawHorizontalBarChart(doc, [
        { label: 'Ture de zi', value: totalDayShifts, color: ORANGE },
        { label: 'Ture de noapte', value: totalNightShifts, color: INDIGO },
        { label: 'Zile concediu', value: totalVacationDays, color: GREEN },
      ], 14, yPos, pageWidth - 28, { title: 'Distributie ture si concedii' }, checkPageBreak);
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, BLUE);
    }

    // ─── 2. Concedii ───
    if (selectedSections.leaves) {
      sn++;
      yPos = checkPageBreak(yPos, 70);
      yPos = drawSectionHeader(doc, 'Concedii', 14, yPos, pageWidth, GREEN, sn);
      const approvedLeaves = filteredLeaveRequests.filter(r => r.status === 'APPROVED');
      const pendingLeaves = filteredLeaveRequests.filter(r => r.status === 'PENDING');
      const rejectedLeaves = filteredLeaveRequests.filter(r => r.status === 'REJECTED');
      const totalLeaveDays = approvedLeaves.reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);
      const leavesByType = approvedLeaves.reduce((acc, req) => {
        acc[req.leaveType] = (acc[req.leaveType] || 0) + calculateWorkingDays(req.startDate, req.endDate);
        return acc;
      }, {} as Record<LeaveType, number>);
      yPos = drawStatCards(doc, [
        { label: 'Total Cereri', value: filteredLeaveRequests.length, color: BLUE },
        { label: 'Zile Aprobate', value: totalLeaveDays, color: GREEN },
        { label: 'In Asteptare', value: pendingLeaves.length, color: ORANGE },
      ], 14, yPos, pageWidth, checkPageBreak);
      yPos = drawStatusDistributionBar(doc, [
        { label: 'Aprobate', value: approvedLeaves.length, color: GREEN },
        { label: 'In asteptare', value: pendingLeaves.length, color: ORANGE },
        { label: 'Respinse', value: rejectedLeaves.length, color: RED },
      ], 14, yPos, pageWidth - 28, { title: 'Status cereri concediu' }, checkPageBreak);
      const leaveBarItems = Object.entries(leavesByType).map(([type, days]) => ({
        label: LEAVE_TYPE_LABELS[type as LeaveType] || type,
        value: days as number,
        color: GREEN as RGB,
      }));
      if (leaveBarItems.length > 0) {
        yPos = drawHorizontalBarChart(doc, leaveBarItems, 14, yPos, pageWidth - 28, { title: 'Zile concediu per tip' }, checkPageBreak);
      }
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, GREEN);
    }

    // ─── 3. Schimburi de tura ───
    if (selectedSections.swaps) {
      sn++;
      yPos = checkPageBreak(yPos, 50);
      yPos = drawSectionHeader(doc, 'Schimburi de tura', 14, yPos, pageWidth, TEAL, sn);
      const approvedSwaps = filteredSwapRequests.filter(r => r.status === 'APPROVED');
      const pendingSwaps = filteredSwapRequests.filter(r => r.status === 'PENDING' || r.status === 'AWAITING_ADMIN');
      const rejectedSwaps = filteredSwapRequests.filter(r => r.status === 'REJECTED');
      yPos = drawStatCards(doc, [
        { label: 'Total Cereri', value: filteredSwapRequests.length, color: TEAL },
        { label: 'Aprobate', value: approvedSwaps.length, color: GREEN },
        { label: 'Respinse', value: rejectedSwaps.length, color: RED },
      ], 14, yPos, pageWidth, checkPageBreak);
      yPos = drawStatusDistributionBar(doc, [
        { label: 'Aprobate', value: approvedSwaps.length, color: GREEN },
        { label: 'In asteptare', value: pendingSwaps.length, color: ORANGE },
        { label: 'Respinse', value: rejectedSwaps.length, color: RED },
      ], 14, yPos, pageWidth - 28, { title: 'Status cereri schimb' }, checkPageBreak);
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, TEAL);
    }

    // ─── 4. Parcari Etajate ───
    if (selectedSections.parkingEtajate) {
      sn++;
      yPos = checkPageBreak(yPos, 50);
      yPos = drawSectionHeader(doc, 'Parcari Etajate', 14, yPos, pageWidth, BLUE, sn);
      const activeIssues = totalParkingIssues.filter((i: any) => i.status === 'ACTIVE').length;
      const finishedIssues = totalParkingIssues.filter((i: any) => i.status === 'FINALIZAT').length;
      yPos = drawStatCards(doc, [
        { label: 'Probleme Active', value: activeIssues, color: ORANGE },
        { label: 'Finalizate', value: finishedIssues, color: GREEN },
        { label: 'Prejudicii', value: totalParkingDamages.length, color: RED },
      ], 14, yPos, pageWidth, checkPageBreak);
      yPos = drawStatusDistributionBar(doc, [
        { label: 'Active', value: activeIssues, color: ORANGE },
        { label: 'Finalizate', value: finishedIssues, color: GREEN },
      ], 14, yPos, pageWidth - 28, { title: 'Status probleme parcari' }, checkPageBreak);
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, BLUE);
    }

    // ─── 5. Parcari Handicap ───
    if (selectedSections.parkingHandicap) {
      sn++;
      yPos = checkPageBreak(yPos, 50);
      yPos = drawSectionHeader(doc, 'Parcari Handicap', 14, yPos, pageWidth, INDIGO, sn);
      const activeHand = totalHandicapRequests.filter((r: any) => r.status === 'ACTIVE').length;
      const finalizatHand = totalHandicapRequests.filter((r: any) => r.status === 'FINALIZAT').length;
      yPos = drawStatCards(doc, [
        { label: 'Total Solicitari', value: totalHandicapRequests.length, color: INDIGO },
        { label: 'Active', value: activeHand, color: ORANGE },
        { label: 'Finalizate', value: finalizatHand, color: GREEN },
      ], 14, yPos, pageWidth, checkPageBreak);
      yPos = drawStatusDistributionBar(doc, [
        { label: 'Active', value: activeHand, color: ORANGE },
        { label: 'Finalizate', value: finalizatHand, color: GREEN },
      ], 14, yPos, pageWidth - 28, { title: 'Status solicitari handicap' }, checkPageBreak);
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, INDIGO);
    }

    // ─── 6. Parcari Domiciliu ───
    if (selectedSections.parkingDomiciliu) {
      sn++;
      yPos = checkPageBreak(yPos, 50);
      yPos = drawSectionHeader(doc, 'Parcari Domiciliu', 14, yPos, pageWidth, EMERALD, sn);
      const activeDom = totalDomiciliuRequests.filter((r: any) => r.status === 'ACTIVE').length;
      const finalizatDom = totalDomiciliuRequests.filter((r: any) => r.status === 'FINALIZAT').length;
      yPos = drawStatCards(doc, [
        { label: 'Total Solicitari', value: totalDomiciliuRequests.length, color: EMERALD },
        { label: 'Active', value: activeDom, color: ORANGE },
        { label: 'Finalizate', value: finalizatDom, color: GREEN },
      ], 14, yPos, pageWidth, checkPageBreak);
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, EMERALD);
    }

    // ─── 7. Procese Verbale / Facturare ───
    if (selectedSections.pvSessions) {
      sn++;
      yPos = checkPageBreak(yPos, 55);
      yPos = drawSectionHeader(doc, 'Procese Verbale / Facturare', 14, yPos, pageWidth, VIOLET, sn);
      const completedPv = totalPvSessions.filter((s: any) => s.status === 'COMPLETED').length;
      const inProgressPv = totalPvSessions.filter((s: any) => s.status === 'IN_PROGRESS').length;
      yPos = drawStatCards(doc, [
        { label: 'Total Sesiuni', value: totalPvSessions.length, color: VIOLET },
        { label: 'Finalizate', value: completedPv, color: GREEN },
        { label: 'In Desfasurare', value: inProgressPv, color: ORANGE },
      ], 14, yPos, pageWidth, checkPageBreak);
      if (totalPvSessions.length > 0) {
        yPos = drawProgressBar(doc, 'Progres finalizare', completedPv, totalPvSessions.length, 14, yPos, pageWidth - 28, VIOLET, undefined, checkPageBreak);
      }
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, VIOLET);
    }

    // ─── 8. Parcometre ───
    if (selectedSections.parcometre) {
      sn++;
      yPos = checkPageBreak(yPos, 55);
      yPos = drawSectionHeader(doc, 'Parcometre', 14, yPos, pageWidth, RED, sn);
      const activeMeters = totalParkingMeters.filter((m: any) => m.isActive).length;
      const rosuMeters = totalParkingMeters.filter((m: any) => m.zone === 'ROSU').length;
      const galbenMeters = totalParkingMeters.filter((m: any) => m.zone === 'GALBEN').length;
      yPos = drawStatCards(doc, [
        { label: 'Total Parcometre', value: totalParkingMeters.length, color: BLUE },
        { label: 'Active', value: activeMeters, color: GREEN },
      ], 14, yPos, pageWidth, checkPageBreak);
      yPos = drawHorizontalBarChart(doc, [
        { label: 'Zona Rosu', value: rosuMeters, color: RED },
        { label: 'Zona Galben', value: galbenMeters, color: ORANGE },
      ], 14, yPos, pageWidth - 28, { title: 'Distributie pe zone' }, checkPageBreak);
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, RED);
    }

    // ─── 9. Control Sesizari ───
    if (selectedSections.controlSesizari) {
      sn++;
      yPos = checkPageBreak(yPos, 50);
      yPos = drawSectionHeader(doc, 'Control Sesizari', 14, yPos, pageWidth, INDIGO, sn);
      const activeSesizari = totalControlSesizari.filter((s: any) => s.status === 'ACTIVE').length;
      const finalizatSesizari = totalControlSesizari.filter((s: any) => s.status === 'FINALIZAT').length;
      yPos = drawStatCards(doc, [
        { label: 'Total Sesizari', value: totalControlSesizari.length, color: INDIGO },
        { label: 'Active', value: activeSesizari, color: ORANGE },
        { label: 'Finalizate', value: finalizatSesizari, color: GREEN },
      ], 14, yPos, pageWidth, checkPageBreak);
      yPos = drawStatusDistributionBar(doc, [
        { label: 'Active', value: activeSesizari, color: ORANGE },
        { label: 'Finalizate', value: finalizatSesizari, color: GREEN },
      ], 14, yPos, pageWidth - 28, { title: 'Status sesizari' }, checkPageBreak);
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, INDIGO);
    }

    // ─── 10. Achizitii ───
    if (selectedSections.achizitii) {
      sn++;
      yPos = checkPageBreak(yPos, 60);
      yPos = drawSectionHeader(doc, 'Achizitii', 14, yPos, pageWidth, ORANGE, sn);
      const totalBuget = totalBudgetPositions.reduce((sum: number, bp: any) => sum + (bp.totalAmount || 0), 0);
      const totalCheltuit = totalBudgetPositions.reduce((sum: number, bp: any) => sum + (bp.spentAmount || 0), 0);
      yPos = drawStatCards(doc, [
        { label: 'Pozitii Bugetare', value: totalBudgetPositions.length, color: BLUE },
        { label: 'Total Buget', value: `${totalBuget.toLocaleString('ro-RO')} lei`, color: ORANGE },
        { label: 'Cheltuit', value: `${totalCheltuit.toLocaleString('ro-RO')} lei`, color: RED },
        { label: 'Ramas', value: `${(totalBuget - totalCheltuit).toLocaleString('ro-RO')} lei`, color: GREEN },
      ], 14, yPos, pageWidth, checkPageBreak);
      if (totalBuget > 0) {
        yPos = drawProgressBar(doc, 'Executie bugetara', totalCheltuit, totalBuget, 14, yPos, pageWidth - 28, ORANGE, undefined, checkPageBreak);
      }
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, ORANGE);
    }

    // ─── 11. Incasari / Cheltuieli ───
    if (selectedSections.incasariCheltuieli) {
      sn++;
      yPos = checkPageBreak(yPos, 50);
      yPos = drawSectionHeader(doc, 'Incasari / Cheltuieli', 14, yPos, pageWidth, EMERALD, sn);
      const grandIncasari = totalRevenueSummary?.grandTotalIncasari || 0;
      const grandCheltuieli = totalRevenueSummary?.grandTotalCheltuieli || 0;
      const diferenta = grandIncasari - grandCheltuieli;
      yPos = drawStatCards(doc, [
        { label: 'Total Incasari', value: `${grandIncasari.toLocaleString('ro-RO')} lei`, color: GREEN },
        { label: 'Total Cheltuieli', value: `${grandCheltuieli.toLocaleString('ro-RO')} lei`, color: RED },
        { label: 'Diferenta', value: `${diferenta.toLocaleString('ro-RO')} lei`, color: diferenta >= 0 ? EMERALD : RED },
      ], 14, yPos, pageWidth, checkPageBreak);
      if (totalRevenueSummary?.categories && totalRevenueSummary.categories.length > 0) {
        yPos = checkPageBreak(yPos, 40);
        const incHeaders = ['Categorie', 'Incasari (lei)', 'Cheltuieli (lei)'];
        const flatCats: any[] = [];
        const flattenCats = (cats: any[]) => {
          cats.forEach((cat: any) => { flatCats.push(cat); if (cat.children?.length > 0) flattenCats(cat.children); });
        };
        flattenCats(totalRevenueSummary.categories);
        const incRows = flatCats.map((cat: any) => [
          cat.categoryName || 'N/A',
          (cat.totalIncasari || 0).toLocaleString('ro-RO'),
          (cat.totalCheltuieli || 0).toLocaleString('ro-RO'),
        ]);
        incRows.push(['TOTAL', grandIncasari.toLocaleString('ro-RO'), grandCheltuieli.toLocaleString('ro-RO')]);
        autoTable(doc, {
          head: [incHeaders], body: incRows, startY: yPos,
          margin: { left: 14, right: 14, top: 20, bottom: 20 },
          tableWidth: pageWidth - 28,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
          didParseCell: (data) => {
            if (data.section === 'body' && data.row.index === incRows.length - 1) {
              data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [232, 245, 233];
            }
          },
        });
        yPos = (doc as any).lastAutoTable?.finalY + 8 || yPos + 20;
      } else {
        yPos += 4;
      }
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, EMERALD);
    }

    // ─── 12. Monitorizare Pontaj ───
    if (selectedSections.pontaj && isAdminOrManager && totalTimeEntries.length > 0) {
      sn++;
      yPos = checkPageBreak(yPos, 55);
      yPos = drawSectionHeader(doc, 'Monitorizare Pontaj', 14, yPos, pageWidth, BLUE, sn);
      const totalOre = (totalTimeEntries.reduce((sum: number, e: any) => sum + (e.durationMinutes || 0), 0) / 60).toFixed(1);
      const angajatiUnici = new Set(totalTimeEntries.map((e: any) => e.userId)).size;
      yPos = drawStatCards(doc, [
        { label: 'Total Intrari', value: totalTimeEntries.length, color: BLUE },
        { label: 'Total Ore', value: `${totalOre}h`, color: GREEN },
        { label: 'Angajati Unici', value: angajatiUnici, color: INDIGO },
      ], 14, yPos, pageWidth, checkPageBreak);
      yPos = drawColoredDivider(doc, 14, yPos, pageWidth - 28, BLUE);
    }

    // ─── 13. Statistici Parcari ───
    if (selectedSections.parkingStats) {
      sn++;
      yPos = checkPageBreak(yPos, 60);
      yPos = drawSectionHeader(doc, 'Statistici Parcari', 14, yPos, pageWidth, VIOLET, sn);
      const totalTichete = totalMonthlyTickets.reduce((sum: number, t: any) => sum + (t.totalTickets || 0), 0);
      const totalAbonamente = totalMonthlySubscriptions.reduce((sum: number, s: any) => sum + (s.subscriptionCount || 0), 0);
      yPos = drawStatCards(doc, [
        { label: 'Tichete Zilnice', value: totalTichete, color: VIOLET },
        { label: 'Abonamente', value: totalAbonamente, color: INDIGO },
        { label: 'Parcari Ocupare', value: totalMonthlyOccupancy.length, color: BLUE },
      ], 14, yPos, pageWidth, checkPageBreak);

      // Bar chart for tickets per location
      if (totalMonthlyTickets.length > 0) {
        const ticketMap = new Map(totalMonthlyTickets.map((t: any) => [t.locationKey, t.totalTickets || 0]));
        const ticketBarItems = PARKING_STAT_LOCATIONS.map(loc => ({
          label: getLocationFullName(loc.key),
          value: ticketMap.get(loc.key) || 0,
          color: VIOLET as RGB,
        })).filter(item => item.value > 0);
        if (ticketBarItems.length > 0) {
          yPos = drawHorizontalBarChart(doc, ticketBarItems, 14, yPos, pageWidth - 28, { title: 'Tichete zilnice per parcare' }, checkPageBreak);
        }
      }

      // Tables (keep existing autoTable for detailed data)
      if (totalMonthlyTickets.length > 0) {
        yPos = checkPageBreak(yPos, 40);
        const ticketMap = new Map(totalMonthlyTickets.map((t: any) => [t.locationKey, t.totalTickets || 0]));
        const ticketRows = PARKING_STAT_LOCATIONS.map(loc => [getLocationFullName(loc.key), (ticketMap.get(loc.key) || 0).toString()]);
        ticketRows.push(['TOTAL', totalTichete.toString()]);
        autoTable(doc, {
          head: [['Parcare', 'Nr. Tichete']], body: ticketRows, startY: yPos,
          margin: { left: 14, right: 14, top: 20, bottom: 20 },
          tableWidth: pageWidth - 28,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 1: { halign: 'right', cellWidth: 30 } },
          didParseCell: (data) => {
            if (data.section === 'body' && data.row.index === ticketRows.length - 1) {
              data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [245, 243, 255];
            }
          },
        });
        yPos = (doc as any).lastAutoTable?.finalY + 6 || yPos + 20;
      }

      if (totalMonthlySubscriptions.length > 0) {
        yPos = checkPageBreak(yPos, 40);
        const subMap = new Map(totalMonthlySubscriptions.map((s: any) => [s.locationKey, s.subscriptionCount || 0]));
        const subRows = PARKING_SUBSCRIPTION_LOCATIONS.map(loc => [loc.name, String(loc.spots), (subMap.get(loc.key) || 0).toString()]);
        const totalSubSpots = PARKING_SUBSCRIPTION_LOCATIONS.reduce((sum, loc) => sum + loc.spots, 0);
        subRows.push(['TOTAL', String(totalSubSpots), totalAbonamente.toString()]);
        autoTable(doc, {
          head: [['Parcare', 'Nr. Locuri', 'Nr. Abonamente']], body: subRows, startY: yPos,
          margin: { left: 14, right: 14, top: 20, bottom: 20 },
          tableWidth: pageWidth - 28,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 1: { halign: 'right', cellWidth: 22 }, 2: { halign: 'right', cellWidth: 30 } },
          didParseCell: (data) => {
            if (data.section === 'body' && data.row.index === subRows.length - 1) {
              data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [245, 243, 255];
            }
          },
        });
        yPos = (doc as any).lastAutoTable?.finalY + 6 || yPos + 20;
      }

      if (totalMonthlyOccupancy.length > 0) {
        yPos = checkPageBreak(yPos, 40);
        const occMap = new Map(totalMonthlyOccupancy.map((o: any) => [o.locationKey, o]));
        const occRows = PARKING_STAT_LOCATIONS.map(loc => {
          const o = occMap.get(loc.key);
          const avg = o ? Number(o.avgAvg || 0) : 0;
          const spots = loc.spots;
          const coefficient = spots > 0 ? ((avg / spots) * 100) : 0;
          return [getLocationFullName(loc.key), String(spots), o ? Number(o.avgMin || 0).toFixed(0) : '0', o ? Number(o.avgMax || 0).toFixed(0) : '0', avg.toFixed(2), coefficient.toFixed(2) + '%'];
        });
        const totalOccAvg = totalMonthlyOccupancy.reduce((s: number, o: any) => s + Number(o.avgAvg || 0), 0);
        const totalCoefficient = TOTAL_PARKING_SPOTS > 0 ? ((totalOccAvg / TOTAL_PARKING_SPOTS) * 100) : 0;
        occRows.push([
          'TOTAL / MEDIE', String(TOTAL_PARKING_SPOTS),
          totalMonthlyOccupancy.reduce((s: number, o: any) => s + Number(o.avgMin || 0), 0).toFixed(0),
          totalMonthlyOccupancy.reduce((s: number, o: any) => s + Number(o.avgMax || 0), 0).toFixed(0),
          totalOccAvg.toFixed(2), totalCoefficient.toFixed(2) + '%',
        ]);
        autoTable(doc, {
          head: [['Parcare', 'Nr. Locuri', 'Minim', 'Maxim', 'Medie', 'Grad/Săpt. (%)']], body: occRows, startY: yPos,
          margin: { left: 14, right: 14, top: 20, bottom: 20 },
          tableWidth: pageWidth - 28,
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 18 }, 2: { halign: 'right', cellWidth: 16 }, 3: { halign: 'right', cellWidth: 16 }, 4: { halign: 'right', cellWidth: 16 }, 5: { halign: 'right', cellWidth: 22 } },
          didParseCell: (data) => {
            if (data.section === 'body' && data.row.index === occRows.length - 1) {
              data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [245, 243, 255];
            }
          },
        });
        yPos = (doc as any).lastAutoTable?.finalY + 8 || yPos + 20;
      }
    }

    // ─── Employee summary table ───
    if (selectedSections.workStats || selectedSections.leaves || selectedSections.swaps) {
      yPos = checkPageBreak(yPos, 50);
      yPos = drawSectionHeader(doc, 'Tabel sumar pe angajati', 14, yPos, pageWidth, BLUE);
      const approvedLeaves = filteredLeaveRequests.filter(r => r.status === 'APPROVED');
      const approvedSwaps = filteredSwapRequests.filter(r => r.status === 'APPROVED');
      const summaryHeaders = ['Angajat', 'Ore', 'Ture zi', 'Ture noapte', 'Zile CO', 'Schimburi'];
      const summaryRows = filteredUsers.map(user => {
        const stats = getUserStats(user.id);
        const userLeaves = approvedLeaves.filter(r => r.userId === user.id);
        const userSwaps = approvedSwaps.filter(r => r.requesterId === user.id);
        const userLeaveDays = userLeaves.reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);
        return [user.fullName, stats.totalHours.toString(), stats.dayShifts.toString(), stats.nightShifts.toString(), userLeaveDays.toString(), userSwaps.length.toString()];
      });
      autoTable(doc, {
        head: [summaryHeaders], body: summaryRows, startY: yPos,
        margin: { left: 14, right: 14, top: 20, bottom: 20 },
        tableWidth: pageWidth - 28,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
      });
    }

    doc.save(`raport-personalizat-${selectedMonth}.pdf`);
    setCustomReportOpen(false);
    } catch (error) {
      console.error('Eroare la generarea raportului PDF:', error);
      notifyError('A aparut o eroare la generarea raportului PDF. Verificati consola pentru detalii.');
    }
  };

  const handleExportCustomExcel = async () => {
    const XLSX = await loadXLSXLib();
    try {
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
    const selectedCount = Object.values(selectedSections).filter(Boolean).length;
    if (selectedCount === 0) return;

    const totalHours = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).totalHours, 0);
    const totalDayShifts = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).dayShifts, 0);
    const totalNightShifts = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).nightShifts, 0);
    const approvedLeaves = filteredLeaveRequests.filter(r => r.status === 'APPROVED');
    const totalLeaveDays = approvedLeaves.reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);
    const approvedSwaps = filteredSwapRequests.filter(r => r.status === 'APPROVED');
    const totalBuget = totalBudgetPositions.reduce((sum: number, bp: any) => sum + (bp.totalAmount || 0), 0);
    const totalCheltuitBuget = totalBudgetPositions.reduce((sum: number, bp: any) => sum + (bp.spentAmount || 0), 0);
    const grandIncasari = totalRevenueSummary?.grandTotalIncasari || 0;
    const grandCheltuieli = totalRevenueSummary?.grandTotalCheltuieli || 0;

    const wb = XLSX.utils.book_new();
    let sn = 0;

    // Sheet 1: Sumar General
    const summaryData: (string | number)[][] = [
      [`Raport personalizat - ${monthLabel}`],
      [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
      [`Sectiuni selectate: ${selectedCount} din ${REPORT_SECTIONS.length}`],
      [],
    ];

    if (selectedSections.workStats) {
      sn++;
      summaryData.push(
        [`=== ${sn}. PROGRAM DE LUCRU ===`],
        [`Total angajati: ${filteredUsers.length}`],
        [`Total ore lucrate: ${totalHours}`],
        [`Total ture de zi: ${totalDayShifts}`],
        [`Total ture de noapte: ${totalNightShifts}`],
        [],
      );
    }
    if (selectedSections.leaves) {
      sn++;
      summaryData.push(
        [`=== ${sn}. CONCEDII ===`],
        [`Total cereri: ${filteredLeaveRequests.length}`],
        [`Aprobate: ${approvedLeaves.length}`],
        [`Total zile aprobate: ${totalLeaveDays}`],
        [],
      );
    }
    if (selectedSections.swaps) {
      sn++;
      summaryData.push(
        [`=== ${sn}. SCHIMBURI DE TURA ===`],
        [`Total cereri: ${filteredSwapRequests.length}`],
        [`Aprobate: ${approvedSwaps.length}`],
        [],
      );
    }
    if (selectedSections.parkingEtajate) {
      sn++;
      summaryData.push(
        [`=== ${sn}. PARCARI ETAJATE ===`],
        [`Probleme active: ${totalParkingIssues.filter((i: any) => i.status === 'ACTIVE').length}`],
        [`Probleme finalizate: ${totalParkingIssues.filter((i: any) => i.status === 'FINALIZAT').length}`],
        [`Total prejudicii: ${totalParkingDamages.length}`],
        [],
      );
    }
    if (selectedSections.parkingHandicap) {
      sn++;
      summaryData.push(
        [`=== ${sn}. PARCARI HANDICAP ===`],
        [`Total solicitari: ${totalHandicapRequests.length}`],
        [`Active: ${totalHandicapRequests.filter((r: any) => r.status === 'ACTIVE').length}`],
        [`Finalizate: ${totalHandicapRequests.filter((r: any) => r.status === 'FINALIZAT').length}`],
        [],
      );
    }
    if (selectedSections.parkingDomiciliu) {
      sn++;
      summaryData.push(
        [`=== ${sn}. PARCARI DOMICILIU ===`],
        [`Total solicitari: ${totalDomiciliuRequests.length}`],
        [`Active: ${totalDomiciliuRequests.filter((r: any) => r.status === 'ACTIVE').length}`],
        [`Finalizate: ${totalDomiciliuRequests.filter((r: any) => r.status === 'FINALIZAT').length}`],
        [],
      );
    }
    if (selectedSections.pvSessions) {
      sn++;
      summaryData.push(
        [`=== ${sn}. PROCESE VERBALE / FACTURARE ===`],
        [`Total sesiuni: ${totalPvSessions.length}`],
        [`Finalizate: ${totalPvSessions.filter((s: any) => s.status === 'COMPLETED').length}`],
        [`In desfasurare: ${totalPvSessions.filter((s: any) => s.status === 'IN_PROGRESS').length}`],
        [],
      );
    }
    if (selectedSections.parcometre) {
      sn++;
      summaryData.push(
        [`=== ${sn}. PARCOMETRE ===`],
        [`Total parcometre: ${totalParkingMeters.length}`],
        [`Active: ${totalParkingMeters.filter((m: any) => m.isActive).length}`],
        [`Zona Rosu: ${totalParkingMeters.filter((m: any) => m.zone === 'ROSU').length}`],
        [`Zona Galben: ${totalParkingMeters.filter((m: any) => m.zone === 'GALBEN').length}`],
        [],
      );
    }
    if (selectedSections.controlSesizari) {
      sn++;
      summaryData.push(
        [`=== ${sn}. CONTROL SESIZARI ===`],
        [`Total sesizari: ${totalControlSesizari.length}`],
        [`Active: ${totalControlSesizari.filter((s: any) => s.status === 'ACTIVE').length}`],
        [`Finalizate: ${totalControlSesizari.filter((s: any) => s.status === 'FINALIZAT').length}`],
        [],
      );
    }
    if (selectedSections.achizitii) {
      sn++;
      summaryData.push(
        [`=== ${sn}. ACHIZITII ===`],
        [`Pozitii bugetare: ${totalBudgetPositions.length}`],
        [`Total buget: ${totalBuget.toLocaleString('ro-RO')} lei`],
        [`Total cheltuit: ${totalCheltuitBuget.toLocaleString('ro-RO')} lei`],
        [`Ramas: ${(totalBuget - totalCheltuitBuget).toLocaleString('ro-RO')} lei`],
        [],
      );
    }
    if (selectedSections.incasariCheltuieli) {
      sn++;
      summaryData.push(
        [`=== ${sn}. INCASARI / CHELTUIELI ===`],
        [`Total incasari: ${grandIncasari.toLocaleString('ro-RO')} lei`],
        [`Total cheltuieli: ${grandCheltuieli.toLocaleString('ro-RO')} lei`],
        [`Diferenta: ${(grandIncasari - grandCheltuieli).toLocaleString('ro-RO')} lei`],
        [],
      );
    }
    if (selectedSections.pontaj && isAdminOrManager && totalTimeEntries.length > 0) {
      sn++;
      const totalOre = (totalTimeEntries.reduce((sum: number, e: any) => sum + (e.durationMinutes || 0), 0) / 60).toFixed(1);
      const angajatiUnici = new Set(totalTimeEntries.map((e: any) => e.userId)).size;
      summaryData.push(
        [`=== ${sn}. MONITORIZARE PONTAJ ===`],
        [`Total intrari: ${totalTimeEntries.length}`],
        [`Total ore: ${totalOre}h`],
        [`Angajati unici: ${angajatiUnici}`],
        [],
      );
    }
    if (selectedSections.parkingStats) {
      sn++;
      const sumTichete = totalMonthlyTickets.reduce((sum: number, t: any) => sum + (t.totalTickets || 0), 0);
      const sumAbonamente = totalMonthlySubscriptions.reduce((sum: number, s: any) => sum + (s.subscriptionCount || 0), 0);
      summaryData.push(
        [`=== ${sn}. STATISTICI PARCARI ===`],
        [`Tichete zilnice (luna): ${sumTichete}`],
        [`Abonamente lunare: ${sumAbonamente}`],
        [`Parcari raportate ocupare: ${totalMonthlyOccupancy.length}`],
        [],
      );
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Sumar');

    // Sheet: Per Employee
    if (selectedSections.workStats || selectedSections.leaves || selectedSections.swaps) {
      const employeeHeaders = ['Angajat', 'Departament', 'Ore lucrate', 'Ture zi', 'Ture noapte', 'Zile CO (program)', 'Zile CO (cereri)', 'Schimburi'];
      const employeeRows = filteredUsers.map(user => {
        const stats = getUserStats(user.id);
        const userLeaves = approvedLeaves.filter(r => r.userId === user.id);
        const userSwaps = approvedSwaps.filter(r => r.requesterId === user.id);
        const userLeaveDays = userLeaves.reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);
        return [user.fullName, user.department?.name || 'N/A', stats.totalHours, stats.dayShifts, stats.nightShifts, stats.vacationDays, userLeaveDays, userSwaps.length];
      });
      const wsEmployees = XLSX.utils.aoa_to_sheet([
        [`Detalii pe angajati - ${monthLabel}`], [], employeeHeaders, ...employeeRows,
      ]);
      wsEmployees['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsEmployees, 'Angajati');
    }

    // Sheet: Parcari Etajate
    if (selectedSections.parkingEtajate && (totalParkingIssues.length > 0 || totalParkingDamages.length > 0)) {
      const parkingData = totalParkingIssues.map((issue: any) => [
        issue.parkingLot?.name || 'N/A', issue.title || 'N/A', issue.status || 'N/A', issue.priority || 'N/A',
        new Date(issue.createdAt).toLocaleDateString('ro-RO'),
      ]);
      const wsParcari = XLSX.utils.aoa_to_sheet([['Parcari Etajate - Probleme'], [], ['Parcare', 'Titlu', 'Status', 'Prioritate', 'Data'], ...parkingData]);
      wsParcari['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsParcari, 'Parcari Etajate');
    }

    // Sheet: Parcari Handicap
    if (selectedSections.parkingHandicap && totalHandicapRequests.length > 0) {
      const handicapData = totalHandicapRequests.map((r: any) => [
        r.applicantName || 'N/A', r.vehicleNumber || 'N/A', r.status || 'N/A', r.parkingLot?.name || 'N/A',
        new Date(r.createdAt).toLocaleDateString('ro-RO'),
      ]);
      const wsHandicap = XLSX.utils.aoa_to_sheet([['Parcari Handicap - Solicitari'], [], ['Solicitant', 'Nr. vehicul', 'Status', 'Parcare', 'Data'], ...handicapData]);
      wsHandicap['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsHandicap, 'Handicap');
    }

    // Sheet: Parcari Domiciliu
    if (selectedSections.parkingDomiciliu && totalDomiciliuRequests.length > 0) {
      const domiciliuData = totalDomiciliuRequests.map((r: any) => [
        r.applicantName || 'N/A', r.vehicleNumber || 'N/A', r.status || 'N/A', r.address || 'N/A',
        new Date(r.createdAt).toLocaleDateString('ro-RO'),
      ]);
      const wsDomiciliu = XLSX.utils.aoa_to_sheet([['Parcari Domiciliu - Solicitari'], [], ['Solicitant', 'Nr. vehicul', 'Status', 'Adresa', 'Data'], ...domiciliuData]);
      wsDomiciliu['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsDomiciliu, 'Domiciliu');
    }

    // Sheet: Procese Verbale
    if (selectedSections.pvSessions && totalPvSessions.length > 0) {
      const pvData = totalPvSessions.map((s: any) => [
        s.month && s.year ? `${s.month}/${s.year}` : 'N/A', s.status || 'N/A', s.days?.length || 0,
        s.days?.filter((d: any) => d.isCompleted).length || 0, new Date(s.createdAt).toLocaleDateString('ro-RO'),
      ]);
      const wsPv = XLSX.utils.aoa_to_sheet([['Procese Verbale - Sesiuni'], [], ['Luna/An', 'Status', 'Nr Zile', 'Zile finalizate', 'Data creare'], ...pvData]);
      wsPv['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsPv, 'PV Facturare');
    }

    // Sheet: Parcometre
    if (selectedSections.parcometre && totalParkingMeters.length > 0) {
      const parcometreData = totalParkingMeters.map((m: any) => [
        m.name || 'N/A', m.zone || 'N/A', m.powerSource || 'N/A', m.condition || 'N/A',
        m.isActive ? 'Da' : 'Nu', m.address || 'N/A',
      ]);
      const wsParcometru = XLSX.utils.aoa_to_sheet([['Parcometre'], [], ['Nume', 'Zona', 'Sursa energie', 'Stare', 'Activ', 'Adresa'], ...parcometreData]);
      wsParcometru['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsParcometru, 'Parcometre');
    }

    // Sheet: Control Sesizari
    if (selectedSections.controlSesizari && totalControlSesizari.length > 0) {
      const sesizariData = totalControlSesizari.map((s: any) => [
        s.type || 'N/A', s.zone || 'N/A', s.location || 'N/A', s.status || 'N/A',
        s.createdByUser?.fullName || 'N/A', new Date(s.createdAt).toLocaleDateString('ro-RO'),
      ]);
      const wsSesizari = XLSX.utils.aoa_to_sheet([['Control Sesizari'], [], ['Tip', 'Zona', 'Locatie', 'Status', 'Creat de', 'Data'], ...sesizariData]);
      wsSesizari['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsSesizari, 'Control Sesizari');
    }

    // Sheet: Achizitii
    if (selectedSections.achizitii && totalBudgetPositions.length > 0) {
      const achizitiiData = totalBudgetPositions.map((bp: any) => [
        bp.name || 'N/A', bp.category === 'INVESTMENTS' ? 'Investitii' : 'Cheltuieli curente',
        bp.totalAmount || 0, bp.spentAmount || 0, (bp.totalAmount || 0) - (bp.spentAmount || 0), bp.acquisitions?.length || 0,
      ]);
      const wsAchizitii = XLSX.utils.aoa_to_sheet([['Achizitii - Pozitii Bugetare 2026'], [],
        ['Pozitie', 'Categorie', 'Buget (lei)', 'Cheltuit (lei)', 'Ramas (lei)', 'Nr achizitii'], ...achizitiiData]);
      wsAchizitii['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsAchizitii, 'Achizitii');
    }

    // Sheet: Incasari / Cheltuieli
    if (selectedSections.incasariCheltuieli && totalRevenueSummary?.categories && totalRevenueSummary.categories.length > 0) {
      const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const incasariHeaders = ['Categorie', ...months, 'Total Incasari', 'Total Cheltuieli'];
      const allCats: any[] = [];
      const flattenRevCats = (cats: any[]) => {
        cats.forEach((cat: any) => { allCats.push(cat); if (cat.children?.length > 0) flattenRevCats(cat.children); });
      };
      flattenRevCats(totalRevenueSummary.categories);
      const incasariData = allCats.map((cat: any) => {
        const row: (string | number)[] = [cat.categoryName || 'N/A'];
        for (let m = 1; m <= 12; m++) { row.push(cat.months?.[m]?.incasari || 0); }
        row.push(cat.totalIncasari || 0); row.push(cat.totalCheltuieli || 0);
        return row;
      });
      const totalsRow: (string | number)[] = ['TOTAL'];
      for (let m = 1; m <= 12; m++) { totalsRow.push(totalRevenueSummary.monthTotals?.[m]?.incasari || 0); }
      totalsRow.push(grandIncasari); totalsRow.push(grandCheltuieli);
      incasariData.push(totalsRow);
      const wsIncasari = XLSX.utils.aoa_to_sheet([['Incasari / Cheltuieli 2026'], [], incasariHeaders, ...incasariData]);
      wsIncasari['!cols'] = [{ wch: 30 }, ...months.map(() => ({ wch: 10 })), { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsIncasari, 'Incasari-Cheltuieli');
    }

    // Sheet: Pontaj (admin only)
    if (selectedSections.pontaj && isAdminOrManager && totalTimeEntries.length > 0) {
      const pontajData = totalTimeEntries.map((e: any) => [
        e.user?.fullName || 'N/A', e.user?.department?.name || 'N/A',
        new Date(e.startTime).toLocaleDateString('ro-RO'),
        new Date(e.startTime).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
        e.endTime ? new Date(e.endTime).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '-',
        e.durationMinutes ? `${Math.floor(e.durationMinutes / 60)}h ${e.durationMinutes % 60}m` : '-',
        e.gpsLatitude ? 'Da' : 'Nu',
      ]);
      const wsPontaj = XLSX.utils.aoa_to_sheet([['Monitorizare Pontaj'], [],
        ['Angajat', 'Departament', 'Data', 'Ora start', 'Ora sfarsit', 'Durata', 'GPS'], ...pontajData]);
      wsPontaj['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }];
      XLSX.utils.book_append_sheet(wb, wsPontaj, 'Pontaj');
    }

    // Sheet: Statistici Parcari
    if (selectedSections.parkingStats) {
      const ticketTotal = totalMonthlyTickets.reduce((sum: number, t: any) => sum + (t.totalTickets || 0), 0);
      const subTotal = totalMonthlySubscriptions.reduce((sum: number, s: any) => sum + (s.subscriptionCount || 0), 0);
      if (ticketTotal > 0 || subTotal > 0 || totalMonthlyOccupancy.length > 0) {
        const ticketMap = new Map(totalMonthlyTickets.map((t: any) => [t.locationKey, t.totalTickets || 0]));
        const subMap = new Map(totalMonthlySubscriptions.map((s: any) => [s.locationKey, s.subscriptionCount || 0]));
        const occMap = new Map(totalMonthlyOccupancy.map((o: any) => [o.locationKey, o]));
        const statsData: (string | number)[][] = [
          [`Statistici Parcari - ${monthLabel}`], [],
          ['=== TICHETE ZILNICE ==='], ['Parcare', 'Numar Tichete'],
          ...PARKING_STAT_LOCATIONS.map(loc => [getLocationFullName(loc.key), ticketMap.get(loc.key) || 0]),
          ['TOTAL', ticketTotal], [],
          ['=== ABONAMENTE LUNARE ==='], ['Parcare', 'Nr. Locuri', 'Numar Abonamente'],
          ...PARKING_SUBSCRIPTION_LOCATIONS.map(loc => [loc.name, loc.spots, subMap.get(loc.key) || 0]),
          ['TOTAL', PARKING_SUBSCRIPTION_LOCATIONS.reduce((sum, loc) => sum + loc.spots, 0), subTotal], [],
          ['=== GRAD DE OCUPARE ==='],
          ['Parcare', 'Nr. Locuri', 'Minim', 'Maxim', 'Medie', 'Grad/Săpt. (%)'],
          ...PARKING_STAT_LOCATIONS.map(loc => {
            const o = occMap.get(loc.key);
            const avg = o ? Number(o.avgAvg || 0) : 0;
            const spots = loc.spots;
            const coefficient = spots > 0 ? Number(((avg / spots) * 100).toFixed(2)) : 0;
            return [getLocationFullName(loc.key), spots, o ? Number(o.avgMin || 0) : 0, o ? Number(o.avgMax || 0) : 0, Number(avg.toFixed(2)), coefficient + '%'];
          }),
        ];
        const wsStats = XLSX.utils.aoa_to_sheet(statsData);
        wsStats['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, wsStats, 'Statistici Parcari');
      }
    }

    XLSX.writeFile(wb, `raport-personalizat-${selectedMonth}.xlsx`);
    setCustomReportOpen(false);
    } catch (error) {
      console.error('Eroare la generarea raportului Excel:', error);
      notifyError('A aparut o eroare la generarea raportului Excel. Verificati consola pentru detalii.');
    }
  };

  // Tab content renderers
  const renderScheduleTab = () => (
    <Stack spacing={3}>
      {/* Filtre */}
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <FilterIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" fontWeight="medium">Filtre:</Typography>
        </Stack>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5 }}>
          <TextField
            placeholder="Cauta dupa nume..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            aria-label="Cauta dupa nume"
            sx={{ width: '100%', maxWidth: { md: 250 } }}
          />
          <FormControl size="small" sx={{ width: '100%', maxWidth: { md: 220 } }}>
            <InputLabel>Departament</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              label="Departament"
            >
              <MenuItem value="ALL">Toate departamentele</MenuItem>
              {departments.map((deptId) => (
                <MenuItem key={deptId} value={deptId}>
                  {users.find(u => u.departmentId === deptId)?.department?.name || deptId}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Legenda */}
      <Paper sx={{ p: 1.5, bgcolor: 'grey.50' }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
            Legenda:
          </Typography>
          <Chip label="Z - Zi 12h" size="small" sx={{ bgcolor: '#4CAF50', color: 'white', fontSize: '0.7rem', height: 24 }} />
          <Chip label="N - Noapte 12h" size="small" sx={{ bgcolor: '#3F51B5', color: 'white', fontSize: '0.7rem', height: 24 }} />
          <Chip label="Z1 - 06-14" size="small" sx={{ bgcolor: '#00BCD4', color: 'white', fontSize: '0.7rem', height: 24 }} />
          <Chip label="Z2 - 14-22" size="small" sx={{ bgcolor: '#9C27B0', color: 'white', fontSize: '0.7rem', height: 24 }} />
          <Chip label="Z3 - 07:30-15:30" size="small" sx={{ bgcolor: '#795548', color: 'white', fontSize: '0.7rem', height: 24 }} />
          <Chip label="N8 - 22-06" size="small" sx={{ bgcolor: '#E91E63', color: 'white', fontSize: '0.7rem', height: 24 }} />
          <Chip label="CO - Concediu" size="small" sx={{ bgcolor: '#FF9800', color: 'white', fontSize: '0.7rem', height: 24 }} />
        </Stack>
      </Paper>

      <Alert severity="info" icon={false}>
        <Typography variant="body2">
          <strong>{filteredUsers.length}</strong> angajati selectati pentru luna <strong>{monthOptions.find(m => m.value === selectedMonth)?.label}</strong>
        </Typography>
      </Alert>

      {/* Butoane Export */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
        <Button
          variant="contained"
          color="error"
          size="large"
          startIcon={<PdfIcon />}
          onClick={handleExportSchedulePDF}
          fullWidth={isMobile}
          disabled={filteredUsers.length === 0 || isLoading}
          sx={{ minWidth: { xs: 'auto', sm: 200 } }}
        >
          Descarca PDF
        </Button>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<ExcelIcon />}
          onClick={handleExportScheduleExcel}
          fullWidth={isMobile}
          disabled={filteredUsers.length === 0 || isLoading}
          sx={{ minWidth: { xs: 'auto', sm: 200 } }}
        >
          Descarca Excel
        </Button>
      </Stack>
    </Stack>
  );

  const renderLeavesTab = () => (
    <Stack spacing={3}>
      {/* Filtre */}
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <FilterIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" fontWeight="medium">Filtre:</Typography>
        </Stack>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5 }}>
          <TextField
            placeholder="Cauta dupa nume..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            aria-label="Cauta dupa nume"
            sx={{ width: '100%', maxWidth: { md: 250 } }}
          />
          <FormControl size="small" sx={{ width: '100%', maxWidth: { md: 180 } }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedLeaveStatus}
              onChange={(e) => setSelectedLeaveStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="ALL">Toate</MenuItem>
              <MenuItem value="PENDING">In asteptare</MenuItem>
              <MenuItem value="APPROVED">Aprobate</MenuItem>
              <MenuItem value="REJECTED">Respinse</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: '100%', maxWidth: { md: 220 } }}>
            <InputLabel>Departament</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              label="Departament"
            >
              <MenuItem value="ALL">Toate departamentele</MenuItem>
              {departments.map((deptId) => (
                <MenuItem key={deptId} value={deptId}>
                  {users.find(u => u.departmentId === deptId)?.department?.name || deptId}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Sumar */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'grey.50' }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
        }}>
          <Box textAlign="center">
            <Typography variant="h4" color="warning.main" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              {filteredLeaveRequests.filter(r => r.status === 'PENDING').length}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>In asteptare</Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="success.main" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              {filteredLeaveRequests.filter(r => r.status === 'APPROVED').length}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Aprobate</Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="error.main" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              {filteredLeaveRequests.filter(r => r.status === 'REJECTED').length}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Respinse</Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              {filteredLeaveRequests
                .filter(r => r.status === 'APPROVED')
                .reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0)}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Total Zile</Typography>
          </Box>
        </Box>
      </Paper>

      <Alert severity="info" icon={false}>
        <Typography variant="body2">
          <strong>{filteredLeaveRequests.length}</strong> cereri de concediu in luna <strong>{monthOptions.find(m => m.value === selectedMonth)?.label}</strong>
        </Typography>
      </Alert>

      {/* Butoane Export */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
        <Button
          variant="contained"
          color="error"
          size="large"
          startIcon={<PdfIcon />}
          onClick={handleExportLeavesPDF}
          fullWidth={isMobile}
          disabled={filteredLeaveRequests.length === 0 || isLoading}
          sx={{ minWidth: { xs: 'auto', sm: 200 } }}
        >
          Descarca PDF
        </Button>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<ExcelIcon />}
          onClick={handleExportLeavesExcel}
          fullWidth={isMobile}
          disabled={filteredLeaveRequests.length === 0 || isLoading}
          sx={{ minWidth: { xs: 'auto', sm: 200 } }}
        >
          Descarca Excel
        </Button>
      </Stack>
    </Stack>
  );

  const renderSwapsTab = () => (
    <Stack spacing={3}>
      {/* Filtre */}
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <FilterIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" fontWeight="medium">Filtre:</Typography>
        </Stack>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5 }}>
          <TextField
            placeholder="Cauta dupa nume..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            aria-label="Cauta dupa nume"
            sx={{ width: '100%', maxWidth: { md: 250 } }}
          />
          <FormControl size="small" sx={{ width: '100%', maxWidth: { md: 180 } }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedSwapStatus}
              onChange={(e) => setSelectedSwapStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="ALL">Toate</MenuItem>
              <MenuItem value="PENDING">In asteptare</MenuItem>
              <MenuItem value="AWAITING_ADMIN">Asteapta admin</MenuItem>
              <MenuItem value="APPROVED">Aprobate</MenuItem>
              <MenuItem value="REJECTED">Respinse</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Sumar */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'grey.50' }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
        }}>
          <Box textAlign="center">
            <Typography variant="h4" color="warning.main" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              {filteredSwapRequests.filter(r => r.status === 'PENDING' || r.status === 'AWAITING_ADMIN').length}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>In asteptare</Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="success.main" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              {filteredSwapRequests.filter(r => r.status === 'APPROVED').length}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Aprobate</Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="error.main" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              {filteredSwapRequests.filter(r => r.status === 'REJECTED').length}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Respinse</Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="text.secondary" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              {filteredSwapRequests.length}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Total</Typography>
          </Box>
        </Box>
      </Paper>

      <Alert severity="info" icon={false}>
        <Typography variant="body2">
          <strong>{filteredSwapRequests.length}</strong> cereri de schimb in luna <strong>{monthOptions.find(m => m.value === selectedMonth)?.label}</strong>
        </Typography>
      </Alert>

      {/* Butoane Export */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
        <Button
          variant="contained"
          color="error"
          size="large"
          startIcon={<PdfIcon />}
          onClick={handleExportSwapsPDF}
          fullWidth={isMobile}
          disabled={filteredSwapRequests.length === 0 || isLoading}
          sx={{ minWidth: { xs: 'auto', sm: 200 } }}
        >
          Descarca PDF
        </Button>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<ExcelIcon />}
          onClick={handleExportSwapsExcel}
          fullWidth={isMobile}
          disabled={filteredSwapRequests.length === 0 || isLoading}
          sx={{ minWidth: { xs: 'auto', sm: 200 } }}
        >
          Descarca Excel
        </Button>
      </Stack>
    </Stack>
  );

  const renderTotalTab = () => {
    const totalHours = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).totalHours, 0);
    const approvedLeaves = filteredLeaveRequests.filter(r => r.status === 'APPROVED');
    const totalLeaveDays = approvedLeaves.reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);
    const approvedSwaps = filteredSwapRequests.filter(r => r.status === 'APPROVED').length;

    return (
      <Stack spacing={3}>
        {/* Selecteaza sectiuni pentru raport */}
        <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.04), border: '1px solid', borderColor: 'primary.light', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TuneIcon color="primary" />
              <Typography variant="subtitle1" fontWeight="bold" color="primary.dark">
                Selecteaza sectiunile pentru raport
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="text" onClick={() => setSelectedSections(Object.fromEntries(REPORT_SECTIONS.map(s => [s.key, true])))}>
                Selecteaza Toate
              </Button>
              <Button size="small" variant="text" onClick={() => setSelectedSections(Object.fromEntries(REPORT_SECTIONS.map(s => [s.key, false])))}>
                Deselecteaza Toate
              </Button>
            </Box>
          </Box>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 0,
          }}>
            {REPORT_SECTIONS.map((section) => (
              <FormControlLabel
                key={section.key}
                control={
                  <Checkbox
                    checked={!!selectedSections[section.key]}
                    onChange={(e) => setSelectedSections(prev => ({ ...prev, [section.key]: e.target.checked }))}
                    size="small"
                  />
                }
                label={<Typography variant="body2">{section.label}</Typography>}
                sx={{ ml: 0, mr: 0 }}
              />
            ))}
          </Box>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1.5} alignItems="center">
            <Chip
              label={`${Object.values(selectedSections).filter(Boolean).length} din ${REPORT_SECTIONS.length} sectiuni selectate`}
              color="primary"
              variant="outlined"
              size="small"
            />
            <Stack direction="row" spacing={1.5} sx={{ width: '100%', justifyContent: 'center', flexWrap: 'wrap', gap: 1.5 }}>
              <Button
                variant="contained"
                color="error"
                startIcon={<PdfIcon />}
                onClick={handleExportCustomPDF}
                disabled={isLoading || Object.values(selectedSections).filter(Boolean).length === 0}
                sx={{ minWidth: { xs: 140, sm: 160 }, flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
              >
                Descarca PDF
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<ExcelIcon />}
                onClick={handleExportCustomExcel}
                disabled={isLoading || Object.values(selectedSections).filter(Boolean).length === 0}
                sx={{ minWidth: { xs: 140, sm: 160 }, flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
              >
                Descarca Excel
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Sumar general */}
        <Paper sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'primary.lighter' }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary.dark" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Sumar general - {monthOptions.find(m => m.value === selectedMonth)?.label}
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: { xs: 2, sm: 3 },
          }}>
            <Box textAlign="center">
              <Typography variant="h3" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
                {totalHours}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Ore lucrate</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h3" color="warning.main" fontWeight="bold" sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
                {totalLeaveDays}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Zile concediu</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h3" color="info.main" fontWeight="bold" sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
                {approvedSwaps}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Schimburi</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h3" color="success.main" fontWeight="bold" sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
                {filteredUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Angajati</Typography>
            </Box>
          </Box>
        </Paper>

        {/* Detalii pe sectiuni - Rand 1 */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              📊 Program de lucru
            </Typography>
            <Typography variant="body2">Total ture de zi: {filteredUsers.reduce((sum, u) => sum + getUserStats(u.id).dayShifts, 0)}</Typography>
            <Typography variant="body2">Total ture de noapte: {filteredUsers.reduce((sum, u) => sum + getUserStats(u.id).nightShifts, 0)}</Typography>
            <Typography variant="body2">Zile libere: {filteredUsers.reduce((sum, u) => sum + getUserStats(u.id).freeDays, 0)}</Typography>
          </Paper>

          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              🏖️ Concedii
            </Typography>
            <Typography variant="body2">Total cereri: {filteredLeaveRequests.length}</Typography>
            <Typography variant="body2">Aprobate: {approvedLeaves.length}</Typography>
            <Typography variant="body2">In asteptare: {filteredLeaveRequests.filter(r => r.status === 'PENDING').length}</Typography>
          </Paper>

          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              🔄 Schimburi de Tura
            </Typography>
            <Typography variant="body2">Total cereri: {filteredSwapRequests.length}</Typography>
            <Typography variant="body2">Aprobate: {approvedSwaps}</Typography>
            <Typography variant="body2">In asteptare: {filteredSwapRequests.filter(r => r.status === 'PENDING' || r.status === 'AWAITING_ADMIN').length}</Typography>
          </Paper>
        </Stack>

        {/* Detalii pe sectiuni - Rand 2 */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              🅿️ Parcari Etajate
            </Typography>
            <Typography variant="body2">Probleme active: {totalParkingIssues.filter((i: any) => i.status === 'ACTIVE').length}</Typography>
            <Typography variant="body2">Probleme finalizate: {totalParkingIssues.filter((i: any) => i.status === 'FINALIZAT').length}</Typography>
            <Typography variant="body2">Prejudicii: {totalParkingDamages.length}</Typography>
          </Paper>

          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              ♿ Parcari Handicap
            </Typography>
            <Typography variant="body2">Total solicitari: {totalHandicapRequests.length}</Typography>
            <Typography variant="body2">Active: {totalHandicapRequests.filter((r: any) => r.status === 'ACTIVE').length}</Typography>
            <Typography variant="body2">Finalizate: {totalHandicapRequests.filter((r: any) => r.status === 'FINALIZAT').length}</Typography>
          </Paper>

          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              🏠 Parcari Domiciliu
            </Typography>
            <Typography variant="body2">Total solicitari: {totalDomiciliuRequests.length}</Typography>
            <Typography variant="body2">Active: {totalDomiciliuRequests.filter((r: any) => r.status === 'ACTIVE').length}</Typography>
            <Typography variant="body2">Finalizate: {totalDomiciliuRequests.filter((r: any) => r.status === 'FINALIZAT').length}</Typography>
          </Paper>
        </Stack>

        {/* Detalii pe sectiuni - Rand 3 */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              📋 Procese Verbale
            </Typography>
            <Typography variant="body2">Total sesiuni: {totalPvSessions.length}</Typography>
            <Typography variant="body2">Finalizate: {totalPvSessions.filter((s: any) => s.status === 'COMPLETED').length}</Typography>
            <Typography variant="body2">In desfasurare: {totalPvSessions.filter((s: any) => s.status === 'IN_PROGRESS').length}</Typography>
          </Paper>

          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              ⏱️ Parcometre
            </Typography>
            <Typography variant="body2">Total parcometre: {totalParkingMeters.length}</Typography>
            <Typography variant="body2">Active: {totalParkingMeters.filter((m: any) => m.isActive).length}</Typography>
            <Typography variant="body2">Zona Rosu: {totalParkingMeters.filter((m: any) => m.zone === 'ROSU').length}</Typography>
          </Paper>

          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              ⚠️ Control Sesizari
            </Typography>
            <Typography variant="body2">Total sesizari: {totalControlSesizari.length}</Typography>
            <Typography variant="body2">Active: {totalControlSesizari.filter((s: any) => s.status === 'ACTIVE').length}</Typography>
            <Typography variant="body2">Finalizate: {totalControlSesizari.filter((s: any) => s.status === 'FINALIZAT').length}</Typography>
          </Paper>
        </Stack>

        {/* Detalii pe sectiuni - Rand 4 */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              🛒 Achizitii
            </Typography>
            <Typography variant="body2">Pozitii bugetare: {totalBudgetPositions.length}</Typography>
            <Typography variant="body2">Total buget: {totalBudgetPositions.reduce((sum: number, bp: any) => sum + (bp.totalAmount || 0), 0).toLocaleString('ro-RO')} lei</Typography>
            <Typography variant="body2">Total cheltuit: {totalBudgetPositions.reduce((sum: number, bp: any) => sum + (bp.spentAmount || 0), 0).toLocaleString('ro-RO')} lei</Typography>
          </Paper>

          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              💰 Incasari / Cheltuieli
            </Typography>
            <Typography variant="body2">Total incasari: {(totalRevenueSummary?.grandTotalIncasari || 0).toLocaleString('ro-RO')} lei</Typography>
            <Typography variant="body2">Total cheltuieli: {(totalRevenueSummary?.grandTotalCheltuieli || 0).toLocaleString('ro-RO')} lei</Typography>
            <Typography variant="body2">Diferenta: {((totalRevenueSummary?.grandTotalIncasari || 0) - (totalRevenueSummary?.grandTotalCheltuieli || 0)).toLocaleString('ro-RO')} lei</Typography>
          </Paper>

          {isAdminOrManager && (
            <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                🕐 Pontaj
              </Typography>
              <Typography variant="body2">Total intrari: {totalTimeEntries.length}</Typography>
              <Typography variant="body2">Total ore: {(totalTimeEntries.reduce((sum: number, e: any) => sum + (e.durationMinutes || 0), 0) / 60).toFixed(1)}h</Typography>
              <Typography variant="body2">Angajati unici: {new Set(totalTimeEntries.map((e: any) => e.userId)).size}</Typography>
            </Paper>
          )}
        </Stack>

        {/* Detalii pe sectiuni - Rand 5: Statistici Parcari */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              🎫 Tichete Zilnice
            </Typography>
            <Typography variant="body2">Total tichete: {totalMonthlyTickets.reduce((sum: any, t: any) => sum + (t.totalTickets || 0), 0)}</Typography>
            <Typography variant="body2">Parcari raportate: {totalMonthlyTickets.length}</Typography>
          </Paper>

          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              💳 Abonamente
            </Typography>
            <Typography variant="body2">Total abonamente: {totalMonthlySubscriptions.reduce((sum: any, s: any) => sum + (s.subscriptionCount || 0), 0)}</Typography>
            <Typography variant="body2">Parcari raportate: {totalMonthlySubscriptions.length}</Typography>
          </Paper>

          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              📈 Grad Ocupare
            </Typography>
            <Typography variant="body2">Medie ocupare: {totalMonthlyOccupancy.length > 0 ? (totalMonthlyOccupancy.reduce((sum: any, o: any) => sum + Number(o.avgAvg || 0), 0)).toFixed(0) : '0'}</Typography>
            <Typography variant="body2">Parcari raportate: {totalMonthlyOccupancy.length}</Typography>
          </Paper>
        </Stack>

        <Alert severity="info" icon={false}>
          <Typography variant="body2">
            Selecteaza sectiunile dorite din partea de sus si apasa Descarca PDF sau Excel pentru a genera raportul personalizat.
          </Typography>
        </Alert>
      </Stack>
    );
  };

  // Calculate summary statistics
  const totalHoursAll = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).totalHours, 0);
  const totalLeaveDaysAll = filteredLeaveRequests
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);
  const totalSwapsApproved = filteredSwapRequests.filter(r => r.status === 'APPROVED').length;

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={3}>
        {/* Header with Gradient */}
        <GradientHeader
          title="Rapoarte"
          subtitle={`Genereaza rapoarte pentru ${monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}`}
          icon={<ReportIcon />}
          gradient="#6366f1 0%, #8b5cf6 100%"
        >
          <Chip
            icon={<TimeIcon sx={{ fontSize: 16 }} />}
            label={`${totalHoursAll} ore`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            size="small"
          />
          <Chip
            icon={<PeopleIcon sx={{ fontSize: 16 }} />}
            label={`${filteredUsers.length} angajati`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            size="small"
          />
          <Chip
            icon={<LeaveIcon sx={{ fontSize: 16 }} />}
            label={`${totalLeaveDaysAll} zile CO`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            size="small"
          />
        </GradientHeader>

        {/* Summary KPI Cards */}
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <StatCard
              title="Ore lucrate"
              value={totalHoursAll}
              subtitle={`Norma: ${monthlyHoursNorm * filteredUsers.length}`}
              icon={<TimeIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#6366f1' }} />}
              color="#6366f1"
              bgColor={alpha('#6366f1', 0.12)}
              delay={0}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <StatCard
              title="Angajati"
              value={filteredUsers.length}
              icon={<PeopleIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#10b981' }} />}
              color="#10b981"
              bgColor={alpha('#10b981', 0.12)}
              delay={100}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <StatCard
              title="Zile concediu"
              value={totalLeaveDaysAll}
              subtitle={`${filteredLeaveRequests.filter(r => r.status === 'APPROVED').length} cereri`}
              icon={<LeaveIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#f59e0b' }} />}
              color="#f59e0b"
              bgColor={alpha('#f59e0b', 0.12)}
              delay={200}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <StatCard
              title="Schimburi"
              value={totalSwapsApproved}
              subtitle={`din ${filteredSwapRequests.length} cereri`}
              icon={<SwapIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#2563eb' }} />}
              color="#2563eb"
              bgColor={alpha('#2563eb', 0.12)}
              delay={300}
            />
          </Grid>
        </Grid>

        {/* Card cu filtre si export */}
        <Card>
          <CardContent>
            <Stack spacing={3}>
              {/* Selector Luna */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight="medium">Luna:</Typography>
                </Stack>
                <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
                  <Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    aria-label="Selecteaza luna"
                  >
                    {monthOptions.map(({ value, label }) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {/* Mobile: Select dropdown — 14+ tabs would never fit cleanly as a tab strip */}
              {isMobile && (() => {
                // Mirror the same order and admin gating as the Tabs below
                const reportOptions = [
                  { value: 0, label: 'Program de lucru' },
                  { value: 1, label: 'Concedii' },
                  { value: 2, label: 'Schimburi' },
                  { value: 3, label: 'Raport total' },
                  { value: 4, label: 'Parcari Etajate' },
                  { value: 5, label: HANDICAP_DEPARTMENT_NAME },
                  { value: 6, label: DOMICILIU_DEPARTMENT_NAME },
                  { value: 7, label: 'PV / Facturare' },
                  { value: 8, label: 'Parcometre' },
                  { value: 9, label: 'Achizitii' },
                  { value: 10, label: 'Control Sesizari' },
                  { value: 11, label: 'Incasari / Cheltuieli' },
                  { value: 12, label: 'Statistici Parcari' },
                  { value: 13, label: 'Control Parcari (note)' },
                  ...(isAdminOrManager ? [{ value: 14, label: 'Pontaj' }] : []),
                ];
                return (
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel>Sectiune raport</InputLabel>
                    <Select
                      value={tabValue}
                      label="Sectiune raport"
                      onChange={(e) => setTabValue(Number(e.target.value))}
                      MenuProps={{ PaperProps: { sx: { maxHeight: 380 } } }}
                    >
                      {reportOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              })()}

              {/* Desktop / tablet: full tab strip */}
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  '& .MuiTabs-scrollButtons': {
                    '&.Mui-disabled': { opacity: 0.3 },
                  },
                  '& .MuiTab-root': {
                    minWidth: { sm: 'auto' },
                    px: { sm: 1.5, md: 2 },
                    fontSize: { sm: '0.8rem', md: '0.875rem' },
                    whiteSpace: 'nowrap',
                  },
                }}
              >
                <Tab
                  icon={<ReportIcon />}
                  iconPosition="start"
                  label={isMobile ? 'Program' : 'Program de lucru'}
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<LeaveIcon />}
                  iconPosition="start"
                  label="Concedii"
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<SwapIcon />}
                  iconPosition="start"
                  label="Schimburi"
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<TotalIcon />}
                  iconPosition="start"
                  label={isMobile ? 'Total' : 'Raport total'}
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<ParkingIcon />}
                  iconPosition="start"
                  label={isMobile ? 'Parcari' : 'Parcari Etajate'}
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<HandicapIcon />}
                  iconPosition="start"
                  label={isMobile ? 'Handicap' : HANDICAP_DEPARTMENT_NAME}
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<HomeIcon />}
                  iconPosition="start"
                  label={isMobile ? 'Domiciliu' : DOMICILIU_DEPARTMENT_NAME}
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<PvIcon />}
                  iconPosition="start"
                  label={isMobile ? 'PV' : 'PV / Facturare'}
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<ParcometreIcon />}
                  iconPosition="start"
                  label="Parcometre"
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<AchizitiiIcon />}
                  iconPosition="start"
                  label="Achizitii"
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<SesizariIcon />}
                  iconPosition="start"
                  label={isMobile ? 'Sesizari' : 'Control Sesizari'}
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<IncasariIcon />}
                  iconPosition="start"
                  label={isMobile ? 'Incasari' : 'Incasari/Cheltuieli'}
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<StatsIcon />}
                  iconPosition="start"
                  label={isMobile ? 'Stat. Parcari' : 'Statistici Parcari'}
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<SesizariIcon />}
                  iconPosition="start"
                  label={isMobile ? 'Control note' : 'Control Parcari (note)'}
                  sx={{ minHeight: 48 }}
                />
                {isAdminOrManager && (
                  <Tab
                    icon={<PontajIcon />}
                    iconPosition="start"
                    label="Pontaj"
                    sx={{ minHeight: 48 }}
                  />
                )}
              </Tabs>

              {/* Loading state */}
              {isLoading && (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {/* Tab Content */}
              {!isLoading && tabValue === 0 && renderScheduleTab()}
              {!isLoading && tabValue === 1 && renderLeavesTab()}
              {!isLoading && tabValue === 2 && renderSwapsTab()}
              {!isLoading && tabValue === 3 && renderTotalTab()}
              <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}>
                {tabValue === 4 && (
                  <ParkingReportsTab
                    startDate={parkingStartDate}
                    endDate={parkingEndDate}
                    onStartDateChange={(date) => date && setParkingStartDate(date)}
                    onEndDateChange={(date) => date && setParkingEndDate(date)}
                  />
                )}
                {tabValue === 5 && (
                  <HandicapReportsTab
                    startDate={parkingStartDate}
                    endDate={parkingEndDate}
                    onStartDateChange={(date) => date && setParkingStartDate(date)}
                    onEndDateChange={(date) => date && setParkingEndDate(date)}
                  />
                )}
                {tabValue === 6 && (
                  <DomiciliuReportsTab
                    startDate={parkingStartDate}
                    endDate={parkingEndDate}
                    onStartDateChange={(date) => date && setParkingStartDate(date)}
                    onEndDateChange={(date) => date && setParkingEndDate(date)}
                  />
                )}
                {tabValue === 7 && (
                  <PvReportsTab
                    startDate={parkingStartDate}
                    endDate={parkingEndDate}
                    onStartDateChange={(date) => date && setParkingStartDate(date)}
                    onEndDateChange={(date) => date && setParkingEndDate(date)}
                  />
                )}
                {tabValue === 8 && (
                  <ParcometreReportsTab
                    startDate={parkingStartDate}
                    endDate={parkingEndDate}
                    onStartDateChange={(date) => date && setParkingStartDate(date)}
                    onEndDateChange={(date) => date && setParkingEndDate(date)}
                  />
                )}
                {tabValue === 9 && (
                  <AchizitiiReportsTab
                    startDate={parkingStartDate}
                    endDate={parkingEndDate}
                    onStartDateChange={(date) => date && setParkingStartDate(date)}
                    onEndDateChange={(date) => date && setParkingEndDate(date)}
                  />
                )}
                {tabValue === 10 && (
                  <ControlSesizariReportsTab
                    startDate={parkingStartDate}
                    endDate={parkingEndDate}
                    onStartDateChange={(date) => date && setParkingStartDate(date)}
                    onEndDateChange={(date) => date && setParkingEndDate(date)}
                  />
                )}
                {tabValue === 11 && (
                  <IncasariCheltuieliReportsTab
                    startDate={parkingStartDate}
                    endDate={parkingEndDate}
                    onStartDateChange={(date) => date && setParkingStartDate(date)}
                    onEndDateChange={(date) => date && setParkingEndDate(date)}
                  />
                )}
                {tabValue === 12 && (
                  <ParkingStatsReportsTab />
                )}
                {tabValue === 13 && (
                  <ControlNotesReportsTab />
                )}
                {isAdminOrManager && tabValue === 14 && (
                  <PontajReportsTab
                    startDate={parkingStartDate}
                    endDate={parkingEndDate}
                    onStartDateChange={(date) => date && setParkingStartDate(date)}
                    onEndDateChange={(date) => date && setParkingEndDate(date)}
                  />
                )}
              </Suspense>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Dialog Raport Personalizat */}
      <Dialog
        open={customReportOpen}
        onClose={() => setCustomReportOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="bold">Raport Personalizat</Typography>
          <Typography variant="body2" color="text.secondary">
            Selecteaza sectiunile pe care doresti sa le incluzi in raport
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Button
              size="small"
              onClick={() => setSelectedSections(Object.fromEntries(REPORT_SECTIONS.map(s => [s.key, true])))}
            >
              Selecteaza Toate
            </Button>
            <Button
              size="small"
              onClick={() => setSelectedSections(Object.fromEntries(REPORT_SECTIONS.map(s => [s.key, false])))}
            >
              Deselecteaza Toate
            </Button>
          </Box>
          <Divider sx={{ mb: 1 }} />
          {REPORT_SECTIONS.map((section) => (
            <FormControlLabel
              key={section.key}
              control={
                <Checkbox
                  checked={!!selectedSections[section.key]}
                  onChange={(e) => setSelectedSections(prev => ({ ...prev, [section.key]: e.target.checked }))}
                  size="small"
                />
              }
              label={section.label}
              sx={{ display: 'block', ml: 0, mb: 0.5 }}
            />
          ))}
          <Divider sx={{ mt: 1, mb: 1 }} />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {Object.values(selectedSections).filter(Boolean).length} din {REPORT_SECTIONS.length} sectiuni selectate
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCustomReportOpen(false)} color="inherit">
            Anuleaza
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<PdfIcon />}
            onClick={handleExportCustomPDF}
            disabled={Object.values(selectedSections).filter(Boolean).length === 0}
          >
            Descarca PDF
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<ExcelIcon />}
            onClick={handleExportCustomExcel}
            disabled={Object.values(selectedSections).filter(Boolean).length === 0}
          >
            Descarca Excel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default React.memo(ReportsPage);
