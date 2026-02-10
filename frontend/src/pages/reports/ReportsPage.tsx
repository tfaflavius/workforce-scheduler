import React, { useState, useMemo } from 'react';
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
} from '@mui/icons-material';
import ParkingReportsTab from './ParkingReportsTab';
import { GradientHeader, StatCard } from '../../components/common';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useGetAllLeaveRequestsQuery } from '../../store/api/leaveRequests.api';
import { useGetAllSwapRequestsQuery } from '../../store/api/shiftSwaps.api';
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '../../types/leave-request.types';
import type { LeaveType, LeaveRequestStatus } from '../../types/leave-request.types';
import type { ShiftSwapStatus } from '../../types/shift-swap.types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Generează lista de luni pentru anul 2026 (toate cele 12 luni)
const generateMonthOptions = () => {
  const options = [];
  const year = 2026;

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
  PENDING: 'În așteptare',
  AWAITING_ADMIN: 'Așteaptă admin',
  APPROVED: 'Aprobat',
  REJECTED: 'Respins',
  CANCELLED: 'Anulat',
  EXPIRED: 'Expirat',
};

const ReportsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tabValue, setTabValue] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filtering state
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  // Lista de luni (generată o singură dată)
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const { data: schedules = [], isLoading: schedulesLoading } = useGetSchedulesQuery({
    monthYear: selectedMonth,
  });
  const { data: users = [] } = useGetUsersQuery({ isActive: true });
  const { data: leaveRequests = [], isLoading: leavesLoading } = useGetAllLeaveRequestsQuery();
  const { data: swapRequests = [], isLoading: swapsLoading } = useGetAllSwapRequestsQuery({});

  const isLoading = schedulesLoading || leavesLoading || swapsLoading;

  // Filtrăm doar angajații și managerii
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

  // Generează zilele lunii
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

  // Calculează numărul de zile lucrătoare din lună și norma de ore
  const workingDaysInMonth = useMemo(() => {
    return calendarDays.filter(d => !d.isWeekend).length;
  }, [calendarDays]);

  const monthlyHoursNorm = useMemo(() => {
    return workingDaysInMonth * 8; // 8 ore pe zi lucrătoare
  }, [workingDaysInMonth]);

  // Creează un map cu toate asignările existente pentru toți angajații
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
          // Normalizează data pentru a evita probleme cu timezone
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

  // Obține info pentru o asignare existentă
  const getExistingShiftInfo = (notes: string) => {
    if (notes === 'Concediu') {
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

    // Filtru după nume
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.fullName.toLowerCase().includes(query)
      );
    }

    // Filtru după departament
    if (selectedDepartment !== 'ALL') {
      filtered = filtered.filter(user => user.departmentId === selectedDepartment);
    }

    return filtered;
  }, [eligibleUsers, searchQuery, selectedDepartment]);

  // Filtrare concedii după luna selectată și status
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
      const matchesSearch = !searchQuery.trim() ||
        req.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by department
      const matchesDepartment = selectedDepartment === 'ALL' ||
        req.user?.department?.id === selectedDepartment;

      return overlapsMonth && matchesStatus && matchesSearch && matchesDepartment;
    });
  }, [leaveRequests, selectedMonth, selectedLeaveStatus, searchQuery, selectedDepartment]);

  // Filtrare schimburi de tură după luna selectată și status
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
      const matchesSearch = !searchQuery.trim() ||
        req.requester?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());

      return inMonth && matchesStatus && matchesSearch;
    });
  }, [swapRequests, selectedMonth, selectedSwapStatus, searchQuery]);

  // Calculează totaluri pentru fiecare angajat
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
  const handleExportSchedulePDF = () => {
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
    doc.text(`Total angajați: ${filteredUsers.length} | Zile lucrătoare: ${workingDaysInMonth} | Normă lunară: ${monthlyHoursNorm} ore`, 14, 27);

    // Prepare table data - fiecare tură pe 2 linii (shift + workPosition)
    const headers = ['Angajat', ...calendarDays.map(d => `${d.day}`), 'Total ore', 'Normă', 'Diferența', 'Ture zi', 'Ture noapte', 'CO'];
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
            // Afișează tură + poziție pe linii separate
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
          // Extrage doar eticheta turei (prima linie din celulă)
          const cellText = data.cell.text[0] || '';
          const shiftLabel = cellText.split('\n')[0];
          const color = shiftColorMap[shiftLabel];
          if (color) {
            data.cell.styles.fillColor = color;
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Coloana "Diferența" - colorată în funcție de valoare
        const diffColumnIndex = calendarDays.length + 3; // După zilele + Total ore + Normă
        if (data.section === 'body' && data.column.index === diffColumnIndex) {
          const cellText = data.cell.text[0] || '0';
          const diffValue = parseInt(cellText.replace('+', ''), 10);
          if (diffValue > 0) {
            // Ore suplimentare - roșu
            data.cell.styles.fillColor = [244, 67, 54];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          } else if (diffValue < 0) {
            // Sub normă - portocaliu/galben
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
    const finalY = (doc as any).lastAutoTable.finalY || 200;
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

    // Adaugă legenda pentru poziții de lucru
    const yPosWorkPosition = yPos + 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Poziții de lucru:', 14, yPosWorkPosition);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('DISP = Dispecerat | CTRL = Control (afișat sub tură)', 14, yPosWorkPosition + 5);

    // Adaugă legenda pentru diferența de ore
    const yPosDiff = yPosWorkPosition + 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Diferența ore:', 14, yPosDiff);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Căsuțe colorate pentru legendă diferență
    doc.setFillColor(244, 67, 54); // Roșu
    doc.rect(14, yPosDiff + 2, 10, 4, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text(' = Ore suplimentare (+)', 25, yPosDiff + 5);

    doc.setFillColor(255, 152, 0); // Portocaliu
    doc.rect(80, yPosDiff + 2, 10, 4, 'F');
    doc.text(' = Sub normă (-)', 91, yPosDiff + 5);

    doc.setFillColor(76, 175, 80); // Verde
    doc.rect(140, yPosDiff + 2, 10, 4, 'F');
    doc.text(' = Conform normei (0)', 151, yPosDiff + 5);

    doc.save(`raport-program-${selectedMonth}.pdf`);
  };

  // Export Work Schedule to Excel
  const handleExportScheduleExcel = () => {
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    const headers = ['Angajat', 'Rol', ...calendarDays.map(d => `${d.day} ${d.dayOfWeek}`), 'Total ore', 'Normă', 'Diferența', 'Ture zi', 'Ture noapte', 'Concediu', 'Liber'];

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
            // Afișează tură + poziție (ex: "Z/DISP" sau doar "Z")
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
      [`Total angajați: ${filteredUsers.length} | Zile lucrătoare: ${workingDaysInMonth} | Normă lunară: ${monthlyHoursNorm} ore (8 ore/zi)`],
      [],
      headers,
      ...rows,
      [],
      ['Legendă ture:'],
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
      ['Legendă poziții de lucru:'],
      ['DISP = Dispecerat'],
      ['CTRL = Control'],
      ['Format: TURĂ/POZIȚIE (ex: Z/DISP = Zi 12h la Dispecerat)'],
      [],
      ['Legendă diferență ore:'],
      ['Valoare pozitivă (+) = Ore suplimentare peste normă'],
      ['Valoare negativă (-) = Sub norma lunară'],
      ['Valoare zero (0) = Conform normei lunare'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [{ wch: 25 }, { wch: 10 }, ...calendarDays.map(() => ({ wch: 8 })), { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 }];
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Program');
    XLSX.writeFile(wb, `raport-program-${selectedMonth}.xlsx`);
  };

  // Export Leave Requests to PDF
  const handleExportLeavesPDF = () => {
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

    doc.text(`Aprobate: ${approved} | În așteptare: ${pending} | Respinse: ${rejected} | Total zile aprobate: ${totalDays}`, 14, 32);

    const headers = ['Angajat', 'Departament', 'Tip concediu', 'Data de început', 'Data de sfârșit', 'Zile', 'Status', 'Motiv'];
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
  const handleExportLeavesExcel = () => {
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    const approved = filteredLeaveRequests.filter(r => r.status === 'APPROVED').length;
    const pending = filteredLeaveRequests.filter(r => r.status === 'PENDING').length;
    const rejected = filteredLeaveRequests.filter(r => r.status === 'REJECTED').length;
    const totalDays = filteredLeaveRequests
      .filter(r => r.status === 'APPROVED')
      .reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);

    const headers = ['Angajat', 'Departament', 'Tip concediu', 'Data de început', 'Data de sfârșit', 'Zile lucrătoare', 'Status', 'Motiv', 'Mesaj admin'];
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
      [`În așteptare: ${pending}`],
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
  const handleExportSwapsPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    doc.setFontSize(18);
    doc.text(`Raport schimburi de tură - ${monthLabel}`, 14, 15);

    doc.setFontSize(10);
    doc.text(`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`, 14, 22);
    doc.text(`Total cereri: ${filteredSwapRequests.length}`, 14, 27);

    // Summary stats
    const approved = filteredSwapRequests.filter(r => r.status === 'APPROVED').length;
    const pending = filteredSwapRequests.filter(r => r.status === 'PENDING' || r.status === 'AWAITING_ADMIN').length;
    const rejected = filteredSwapRequests.filter(r => r.status === 'REJECTED').length;

    doc.text(`Aprobate: ${approved} | În așteptare: ${pending} | Respinse: ${rejected}`, 14, 32);

    const headers = ['Solicitant', 'Data solicitantului', 'Tura solicitantului', 'Data dorită', 'Tura dorită', 'Înlocuitor', 'Status', 'Motiv'];
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
  const handleExportSwapsExcel = () => {
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    const approved = filteredSwapRequests.filter(r => r.status === 'APPROVED').length;
    const pending = filteredSwapRequests.filter(r => r.status === 'PENDING' || r.status === 'AWAITING_ADMIN').length;
    const rejected = filteredSwapRequests.filter(r => r.status === 'REJECTED').length;

    const headers = ['Solicitant', 'Data solicitantului', 'Tura solicitantului', 'Data dorită', 'Tura dorită', 'Înlocuitor aprobat', 'Status', 'Motiv', 'Notă admin'];
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
      [`Raport schimburi de tură - ${monthLabel}`],
      [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
      [],
      ['Sumar:'],
      [`Total cereri: ${filteredSwapRequests.length}`],
      [`Aprobate: ${approved}`],
      [`În așteptare: ${pending}`],
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

  // Export Total Report to PDF
  const handleExportTotalPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    doc.setFontSize(20);
    doc.text(`Raport total - ${monthLabel}`, 14, 20);

    doc.setFontSize(10);
    doc.text(`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`, 14, 28);

    let yPos = 40;

    // Section 1: Work Statistics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Statistici program de lucru', 14, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;

    const totalHours = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).totalHours, 0);
    const totalDayShifts = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).dayShifts, 0);
    const totalNightShifts = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).nightShifts, 0);
    const totalVacationDays = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).vacationDays, 0);

    doc.setFontSize(10);
    doc.text(`Total angajați: ${filteredUsers.length}`, 20, yPos); yPos += 6;
    doc.text(`Total ore lucrate: ${totalHours}`, 20, yPos); yPos += 6;
    doc.text(`Total ture de zi: ${totalDayShifts}`, 20, yPos); yPos += 6;
    doc.text(`Total ture de noapte: ${totalNightShifts}`, 20, yPos); yPos += 6;
    doc.text(`Total zile concediu (din program): ${totalVacationDays}`, 20, yPos); yPos += 15;

    // Section 2: Leave Statistics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Statistici concedii', 14, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;

    const approvedLeaves = filteredLeaveRequests.filter(r => r.status === 'APPROVED');
    const pendingLeaves = filteredLeaveRequests.filter(r => r.status === 'PENDING');
    const rejectedLeaves = filteredLeaveRequests.filter(r => r.status === 'REJECTED');
    const totalLeaveDays = approvedLeaves.reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);

    // Stats by leave type
    const leavesByType = approvedLeaves.reduce((acc, req) => {
      acc[req.leaveType] = (acc[req.leaveType] || 0) + calculateWorkingDays(req.startDate, req.endDate);
      return acc;
    }, {} as Record<LeaveType, number>);

    doc.setFontSize(10);
    doc.text(`Total cereri concediu: ${filteredLeaveRequests.length}`, 20, yPos); yPos += 6;
    doc.text(`Aprobate: ${approvedLeaves.length} | În așteptare: ${pendingLeaves.length} | Respinse: ${rejectedLeaves.length}`, 20, yPos); yPos += 6;
    doc.text(`Total zile concediu aprobate: ${totalLeaveDays}`, 20, yPos); yPos += 8;

    doc.text('Defalcare pe tipuri de concediu:', 20, yPos); yPos += 6;
    Object.entries(leavesByType).forEach(([type, days]) => {
      doc.text(`  • ${LEAVE_TYPE_LABELS[type as LeaveType]}: ${days} zile`, 25, yPos);
      yPos += 5;
    });
    yPos += 10;

    // Section 3: Shift Swap Statistics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Statistici schimburi de tură', 14, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;

    const approvedSwaps = filteredSwapRequests.filter(r => r.status === 'APPROVED');
    const pendingSwaps = filteredSwapRequests.filter(r => r.status === 'PENDING' || r.status === 'AWAITING_ADMIN');
    const rejectedSwaps = filteredSwapRequests.filter(r => r.status === 'REJECTED');

    doc.setFontSize(10);
    doc.text(`Total cereri schimb: ${filteredSwapRequests.length}`, 20, yPos); yPos += 6;
    doc.text(`Aprobate: ${approvedSwaps.length} | În așteptare: ${pendingSwaps.length} | Respinse: ${rejectedSwaps.length}`, 20, yPos); yPos += 15;

    // Section 4: Summary Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Tabel sumar pe angajați', 14, yPos);
    yPos += 8;

    const summaryHeaders = ['Angajat', 'Ore lucrate', 'Zile CO', 'Schimburi'];
    const summaryRows = filteredUsers.slice(0, 20).map(user => {
      const stats = getUserStats(user.id);
      const userLeaves = approvedLeaves.filter(r => r.userId === user.id);
      const userSwaps = approvedSwaps.filter(r => r.requesterId === user.id);
      const userLeaveDays = userLeaves.reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);

      return [
        user.fullName,
        stats.totalHours.toString(),
        userLeaveDays.toString(),
        userSwaps.length.toString(),
      ];
    });

    autoTable(doc, {
      head: [summaryHeaders],
      body: summaryRows,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [25, 118, 210], textColor: 255 },
    });

    doc.save(`raport-total-${selectedMonth}.pdf`);
  };

  // Export Total Report to Excel
  const handleExportTotalExcel = () => {
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    const totalHours = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).totalHours, 0);
    const totalDayShifts = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).dayShifts, 0);
    const totalNightShifts = filteredUsers.reduce((sum, user) => sum + getUserStats(user.id).nightShifts, 0);

    const approvedLeaves = filteredLeaveRequests.filter(r => r.status === 'APPROVED');
    const totalLeaveDays = approvedLeaves.reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);

    const approvedSwaps = filteredSwapRequests.filter(r => r.status === 'APPROVED');

    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      [`Raport total - ${monthLabel}`],
      [`Generat la: ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}`],
      [],
      ['=== STATISTICI PROGRAM DE LUCRU ==='],
      [`Total angajați: ${filteredUsers.length}`],
      [`Total ore lucrate: ${totalHours}`],
      [`Total ture de zi: ${totalDayShifts}`],
      [`Total ture de noapte: ${totalNightShifts}`],
      [],
      ['=== STATISTICI CONCEDII ==='],
      [`Total cereri: ${filteredLeaveRequests.length}`],
      [`Aprobate: ${approvedLeaves.length}`],
      [`Total zile aprobate: ${totalLeaveDays}`],
      [],
      ['=== STATISTICI SCHIMBURI ==='],
      [`Total cereri: ${filteredSwapRequests.length}`],
      [`Aprobate: ${approvedSwaps.length}`],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Sumar');

    // Sheet 2: Per Employee
    const employeeHeaders = ['Angajat', 'Departament', 'Ore lucrate', 'Ture zi', 'Ture noapte', 'Zile concediu (program)', 'Zile concediu (cereri)', 'Schimburi aprobate'];
    const employeeRows = filteredUsers.map(user => {
      const stats = getUserStats(user.id);
      const userLeaves = approvedLeaves.filter(r => r.userId === user.id);
      const userSwaps = approvedSwaps.filter(r => r.requesterId === user.id);
      const userLeaveDays = userLeaves.reduce((sum, r) => sum + calculateWorkingDays(r.startDate, r.endDate), 0);

      return [
        user.fullName,
        user.department?.name || 'N/A',
        stats.totalHours,
        stats.dayShifts,
        stats.nightShifts,
        stats.vacationDays,
        userLeaveDays,
        userSwaps.length,
      ];
    });

    const wsEmployees = XLSX.utils.aoa_to_sheet([
      [`Detalii pe angajați - ${monthLabel}`],
      [],
      employeeHeaders,
      ...employeeRows,
    ]);
    wsEmployees['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsEmployees, 'Pe Angajați');

    XLSX.writeFile(wb, `raport-total-${selectedMonth}.xlsx`);
  };

  // Tab content renderers
  const renderScheduleTab = () => (
    <Stack spacing={3}>
      {/* Filtre */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <FilterIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" fontWeight="medium">Filtre:</Typography>
        </Stack>

        <TextField
          placeholder="Caută după nume..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ minWidth: { xs: '100%', sm: 200 } }}
        />

        <FormControl sx={{ minWidth: { xs: '100%', sm: 180 } }} size="small">
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
      </Stack>

      {/* Legendă */}
      <Paper sx={{ p: 1.5, bgcolor: 'grey.50' }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
            Legendă:
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
          <strong>{filteredUsers.length}</strong> angajați selectați pentru luna <strong>{monthOptions.find(m => m.value === selectedMonth)?.label}</strong>
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
          sx={{ minWidth: 200 }}
        >
          Descarcă PDF
        </Button>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<ExcelIcon />}
          onClick={handleExportScheduleExcel}
          fullWidth={isMobile}
          disabled={filteredUsers.length === 0 || isLoading}
          sx={{ minWidth: 200 }}
        >
          Descarcă Excel
        </Button>
      </Stack>
    </Stack>
  );

  const renderLeavesTab = () => (
    <Stack spacing={3}>
      {/* Filtre */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <FilterIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" fontWeight="medium">Filtre:</Typography>
        </Stack>

        <TextField
          placeholder="Caută după nume..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ minWidth: { xs: '100%', sm: 200 } }}
        />

        <FormControl sx={{ minWidth: { xs: '100%', sm: 150 } }} size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedLeaveStatus}
            onChange={(e) => setSelectedLeaveStatus(e.target.value)}
            label="Status"
          >
            <MenuItem value="ALL">Toate</MenuItem>
            <MenuItem value="PENDING">În așteptare</MenuItem>
            <MenuItem value="APPROVED">Aprobate</MenuItem>
            <MenuItem value="REJECTED">Respinse</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: { xs: '100%', sm: 180 } }} size="small">
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
      </Stack>

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
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>În așteptare</Typography>
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
          <strong>{filteredLeaveRequests.length}</strong> cereri de concediu în luna <strong>{monthOptions.find(m => m.value === selectedMonth)?.label}</strong>
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
          sx={{ minWidth: 200 }}
        >
          Descarcă PDF
        </Button>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<ExcelIcon />}
          onClick={handleExportLeavesExcel}
          fullWidth={isMobile}
          disabled={filteredLeaveRequests.length === 0 || isLoading}
          sx={{ minWidth: 200 }}
        >
          Descarcă Excel
        </Button>
      </Stack>
    </Stack>
  );

  const renderSwapsTab = () => (
    <Stack spacing={3}>
      {/* Filtre */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <FilterIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" fontWeight="medium">Filtre:</Typography>
        </Stack>

        <TextField
          placeholder="Caută după nume..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ minWidth: { xs: '100%', sm: 200 } }}
        />

        <FormControl sx={{ minWidth: { xs: '100%', sm: 150 } }} size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedSwapStatus}
            onChange={(e) => setSelectedSwapStatus(e.target.value)}
            label="Status"
          >
            <MenuItem value="ALL">Toate</MenuItem>
            <MenuItem value="PENDING">În așteptare</MenuItem>
            <MenuItem value="AWAITING_ADMIN">Așteaptă admin</MenuItem>
            <MenuItem value="APPROVED">Aprobate</MenuItem>
            <MenuItem value="REJECTED">Respinse</MenuItem>
          </Select>
        </FormControl>
      </Stack>

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
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>În așteptare</Typography>
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
          <strong>{filteredSwapRequests.length}</strong> cereri de schimb în luna <strong>{monthOptions.find(m => m.value === selectedMonth)?.label}</strong>
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
          sx={{ minWidth: 200 }}
        >
          Descarcă PDF
        </Button>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<ExcelIcon />}
          onClick={handleExportSwapsExcel}
          fullWidth={isMobile}
          disabled={filteredSwapRequests.length === 0 || isLoading}
          sx={{ minWidth: 200 }}
        >
          Descarcă Excel
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
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Angajați</Typography>
            </Box>
          </Box>
        </Paper>

        {/* Detalii pe secțiuni */}
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
            <Typography variant="body2">În așteptare: {filteredLeaveRequests.filter(r => r.status === 'PENDING').length}</Typography>
          </Paper>

          <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              🔄 Schimburi de Tură
            </Typography>
            <Typography variant="body2">Total cereri: {filteredSwapRequests.length}</Typography>
            <Typography variant="body2">Aprobate: {approvedSwaps}</Typography>
            <Typography variant="body2">În așteptare: {filteredSwapRequests.filter(r => r.status === 'PENDING' || r.status === 'AWAITING_ADMIN').length}</Typography>
          </Paper>
        </Stack>

        <Alert severity="success" icon={false}>
          <Typography variant="body2">
            Raportul total include date din toate cele 3 secțiuni: program de lucru, concedii și schimburi de tură.
          </Typography>
        </Alert>

        {/* Butoane Export */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<PdfIcon />}
            onClick={handleExportTotalPDF}
            fullWidth={isMobile}
            disabled={isLoading}
            sx={{ minWidth: 200 }}
          >
            Descarcă PDF
          </Button>
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<ExcelIcon />}
            onClick={handleExportTotalExcel}
            fullWidth={isMobile}
            disabled={isLoading}
            sx={{ minWidth: 200 }}
          >
            Descarcă Excel
          </Button>
        </Stack>
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
          subtitle={`Generează rapoarte pentru ${monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}`}
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
            label={`${filteredUsers.length} angajați`}
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
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard
              title="Ore lucrate"
              value={totalHoursAll}
              subtitle={`Normă: ${monthlyHoursNorm * filteredUsers.length}`}
              icon={<TimeIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#6366f1' }} />}
              color="#6366f1"
              bgColor={alpha('#6366f1', 0.12)}
              delay={0}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard
              title="Angajați"
              value={filteredUsers.length}
              icon={<PeopleIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#10b981' }} />}
              color="#10b981"
              bgColor={alpha('#10b981', 0.12)}
              delay={100}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
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
          <Grid size={{ xs: 6, sm: 3 }}>
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

        {/* Card cu filtre și export */}
        <Card>
          <CardContent>
            <Stack spacing={3}>
              {/* Selector Lună */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight="medium">Luna:</Typography>
                </Stack>
                <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
                  <Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {monthOptions.map(({ value, label }) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {/* Tabs */}
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                variant={isMobile ? 'scrollable' : 'standard'}
                scrollButtons="auto"
                allowScrollButtonsMobile
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
                  label={isMobile ? 'Parcări' : 'Parcări Etajate'}
                  sx={{ minHeight: 48 }}
                />
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
              {tabValue === 4 && (
                <ParkingReportsTab
                  startDate={parkingStartDate}
                  endDate={parkingEndDate}
                  onStartDateChange={setParkingStartDate}
                  onEndDateChange={setParkingEndDate}
                />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default ReportsPage;
