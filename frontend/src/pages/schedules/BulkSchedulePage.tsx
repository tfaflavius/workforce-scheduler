import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Badge,
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SelectAll as SelectAllIcon,
  CheckCircle as CheckCircleIcon,
  Group as GroupIcon,
  FlashOn as FlashOnIcon,
  ContentCopy as ContentCopyIcon,
  DateRange as DateRangeIcon,
  PlaylistAdd as PlaylistAddIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCreateScheduleMutation, useUpdateScheduleMutation, useGetSchedulesQuery, useGetShiftTypesQuery, useGetWorkPositionsQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useGetApprovedLeavesByMonthQuery } from '../../store/api/leaveRequests.api';
import { useAppSelector } from '../../store/hooks';
import type { ScheduleAssignmentDto, ScheduleStatus } from '../../types/schedule.types';

// Tipuri de ture
type ShiftPatternType = '12H' | '8H';

interface ShiftOption {
  id: string;
  label: string;
  shortLabel: string;
  startTime: string;
  endTime: string;
  color: string;
  isNightShift: boolean;
  isVacation: boolean;
}

// Optiuni pentru tura de 12 ore
const SHIFT_OPTIONS_12H: ShiftOption[] = [
  { id: 'day_12', label: 'Zi 07-19', shortLabel: 'Z', startTime: '07:00', endTime: '19:00', color: '#4CAF50', isNightShift: false, isVacation: false },
  { id: 'night_12', label: 'Noapte 19-07', shortLabel: 'N', startTime: '19:00', endTime: '07:00', color: '#3F51B5', isNightShift: true, isVacation: false },
  { id: 'vacation_12', label: 'Concediu', shortLabel: 'CO', startTime: '', endTime: '', color: '#FF9800', isNightShift: false, isVacation: true },
];

// Optiuni pentru tura de 8 ore
const SHIFT_OPTIONS_8H: ShiftOption[] = [
  { id: 'day1_8', label: 'Zi 06-14', shortLabel: 'Z1', startTime: '06:00', endTime: '14:00', color: '#00BCD4', isNightShift: false, isVacation: false },
  { id: 'day2_8', label: 'Zi 14-22', shortLabel: 'Z2', startTime: '14:00', endTime: '22:00', color: '#9C27B0', isNightShift: false, isVacation: false },
  { id: 'day3_8', label: 'Zi 07:30-15:30', shortLabel: 'Z3', startTime: '07:30', endTime: '15:30', color: '#795548', isNightShift: false, isVacation: false },
  { id: 'day4_8', label: 'Zi 09-17', shortLabel: 'Z4', startTime: '09:00', endTime: '17:00', color: '#009688', isNightShift: false, isVacation: false },
  { id: 'day5_8', label: 'Zi 08-16', shortLabel: 'Z5', startTime: '08:00', endTime: '16:00', color: '#FF5722', isNightShift: false, isVacation: false },
  { id: 'day6_8', label: 'Zi 13-21', shortLabel: 'Z6', startTime: '13:00', endTime: '21:00', color: '#673AB7', isNightShift: false, isVacation: false },
  { id: 'night_8', label: 'Noapte 22-06', shortLabel: 'N8', startTime: '22:00', endTime: '06:00', color: '#E91E63', isNightShift: true, isVacation: false },
  { id: 'vacation_8', label: 'Concediu', shortLabel: 'CO', startTime: '', endTime: '', color: '#FF9800', isNightShift: false, isVacation: true },
];

// Genereaza lista de luni pentru anul 2026
const generateMonthOptions = () => {
  const options = [];
  const year = 2026;
  for (let month = 0; month < 12; month++) {
    const date = new Date(year, month, 1);
    const value = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });
    options.push({ value, label });
  }
  return options;
};

const BulkSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const isAdmin = currentUser?.role === 'ADMIN';

  // State
  const [shiftPattern, setShiftPattern] = useState<ShiftPatternType>('12H');
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showUserSelector, setShowUserSelector] = useState(true);

  // Asignari: { oderId: { date: localShiftId } }
  const [bulkAssignments, setBulkAssignments] = useState<Record<string, Record<string, string>>>({});
  // Pozitii de lucru: { oderId: { date: workPositionId } }
  const [bulkWorkPositions, setBulkWorkPositions] = useState<Record<string, Record<string, string>>>({});

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState<{ current: number; total: number } | null>(null);

  // Dialog states pentru actiuni rapide
  const [quickActionDialog, setQuickActionDialog] = useState<'apply_day' | 'apply_week' | 'copy' | 'template' | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedShiftForAction, setSelectedShiftForAction] = useState<string>('');
  const [copySourceUserId, setCopySourceUserId] = useState<string>('');
  const [copyTargetUserIds, setCopyTargetUserIds] = useState<string[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>('');
  const [templatePattern, setTemplatePattern] = useState<string[]>([]);

  // Template-uri predefinite
  const SHIFT_TEMPLATES = [
    { id: 'znll', name: 'Zi-Noapte-Liber-Liber', pattern: ['day_12', 'night_12', '', ''] },
    { id: 'zznll', name: 'Zi-Zi-Noapte-Liber-Liber', pattern: ['day_12', 'day_12', 'night_12', '', ''] },
    { id: 'zzlnnl', name: 'Zi-Zi-Liber-Noapte-Noapte-Liber', pattern: ['day_12', 'day_12', '', 'night_12', 'night_12', ''] },
    { id: 'work5', name: '5 zile lucru (L-V)', pattern: ['day_12', 'day_12', 'day_12', 'day_12', 'day_12', '', ''] },
  ];

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // API hooks
  const { data: users = [] } = useGetUsersQuery({ isActive: true });
  const { data: existingSchedules = [], isLoading: schedulesLoading, refetch: refetchSchedules } = useGetSchedulesQuery({ monthYear });
  const { data: dbShiftTypes = [] } = useGetShiftTypesQuery();
  const { data: dbWorkPositions = [] } = useGetWorkPositionsQuery();
  const { data: approvedLeaves = [] } = useGetApprovedLeavesByMonthQuery(monthYear);
  const [createSchedule] = useCreateScheduleMutation();
  const [updateSchedule] = useUpdateScheduleMutation();

  // Filtram angajatii si managerii, sortam dupa departament
  const eligibleUsers = useMemo(() => {
    const filtered = users.filter(u => u.role === 'USER' || u.role === 'MANAGER');
    const departmentOrder: Record<string, number> = {
      'Dispecerat': 1,
      'Control': 2,
      'Intretinere Parcari': 3,
    };
    filtered.sort((a, b) => {
      const orderA = departmentOrder[a.department?.name || ''] || 99;
      const orderB = departmentOrder[b.department?.name || ''] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.fullName.localeCompare(b.fullName);
    });
    return filtered;
  }, [users]);

  // Grupeaza utilizatorii pe departamente
  const usersByDepartment = useMemo(() => {
    const groups: Record<string, typeof eligibleUsers> = {};
    eligibleUsers.forEach(user => {
      const dept = user.department?.name || 'Fara Departament';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(user);
    });
    return groups;
  }, [eligibleUsers]);

  // Optiunile de tura
  const shiftOptions = shiftPattern === '12H' ? SHIFT_OPTIONS_12H : SHIFT_OPTIONS_8H;

  // Zilele lunii
  const daysInMonth = useMemo(() => {
    const [year, month] = monthYear.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }, [monthYear]);

  const calendarDays = useMemo(() => {
    const [year, month] = monthYear.split('-').map(Number);
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
  }, [monthYear, daysInMonth]);

  // Mapare shift types din DB
  const getShiftTypeId = useCallback((localId: string): string | null => {
    const nameMapping: Record<string, string> = {
      'day_12': 'Zi 07-19',
      'night_12': 'Noapte 19-07',
      'vacation_12': 'Concediu 12H',
      'day1_8': 'Zi 06-14',
      'day2_8': 'Zi 14-22',
      'day3_8': 'Zi 07:30-15:30',
      'day4_8': 'Zi 09-17',
      'day5_8': 'Zi 08-16',
      'day6_8': 'Zi 13-21',
      'night_8': 'Noapte 22-06',
      'vacation_8': 'Concediu 8H',
    };
    const expectedName = nameMapping[localId];
    if (!expectedName) return null;
    const dbShift = dbShiftTypes.find(st => st.name === expectedName);
    return dbShift?.id || null;
  }, [dbShiftTypes]);

  // Incarca asignarile existente pentru toti utilizatorii selectati
  useEffect(() => {
    if (schedulesLoading || selectedUserIds.length === 0) return;

    const loadedAssignments: Record<string, Record<string, string>> = {};
    const loadedPositions: Record<string, Record<string, string>> = {};

    selectedUserIds.forEach(userId => {
      loadedAssignments[userId] = {};
      loadedPositions[userId] = {};

      // Gaseste asignarile din schedule-uri existente
      existingSchedules.forEach(schedule => {
        schedule.assignments?.forEach(assignment => {
          if (assignment.userId === userId) {
            const normalizedDate = assignment.shiftDate.split('T')[0];
            const notes = assignment.notes || '';

            // Mapare notes -> local shift id
            let localShiftId = '';
            if (notes.includes('Concediu')) {
              localShiftId = shiftPattern === '8H' ? 'vacation_8' : 'vacation_12';
            } else if (notes.includes('07:00-19:00')) localShiftId = 'day_12';
            else if (notes.includes('19:00-07:00')) localShiftId = 'night_12';
            else if (notes.includes('06:00-14:00')) localShiftId = 'day1_8';
            else if (notes.includes('14:00-22:00')) localShiftId = 'day2_8';
            else if (notes.includes('07:30-15:30')) localShiftId = 'day3_8';
            else if (notes.includes('09:00-17:00')) localShiftId = 'day4_8';
            else if (notes.includes('08:00-16:00')) localShiftId = 'day5_8';
            else if (notes.includes('13:00-21:00')) localShiftId = 'day6_8';
            else if (notes.includes('22:00-06:00')) localShiftId = 'night_8';

            if (localShiftId) {
              loadedAssignments[userId][normalizedDate] = localShiftId;
              if (assignment.workPositionId && dbWorkPositions.some(p => p.id === assignment.workPositionId)) {
                loadedPositions[userId][normalizedDate] = assignment.workPositionId;
              }
            }
          }
        });
      });

      // Adauga concediile aprobate
      const userLeaves = approvedLeaves.filter(leave => leave.userId === userId);
      userLeaves.forEach(leave => {
        leave.dates.forEach(date => {
          if (!loadedAssignments[userId][date]) {
            loadedAssignments[userId][date] = shiftPattern === '8H' ? 'vacation_8' : 'vacation_12';
          }
        });
      });
    });

    setBulkAssignments(loadedAssignments);
    setBulkWorkPositions(loadedPositions);
  }, [selectedUserIds, existingSchedules, approvedLeaves, schedulesLoading, shiftPattern, dbWorkPositions]);

  // Handler pentru selectia unui user
  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handler pentru selectia unui departament intreg
  const handleDepartmentToggle = (deptName: string) => {
    const deptUsers = usersByDepartment[deptName] || [];
    const deptUserIds = deptUsers.map(u => u.id);
    const allSelected = deptUserIds.every(id => selectedUserIds.includes(id));

    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !deptUserIds.includes(id)));
    } else {
      setSelectedUserIds(prev => [...new Set([...prev, ...deptUserIds])]);
    }
  };

  // Handler pentru selectia tuturor
  const handleSelectAll = () => {
    if (selectedUserIds.length === eligibleUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(eligibleUsers.map(u => u.id));
    }
  };

  // Handler pentru schimbarea turei unui user intr-o zi
  const handleShiftChange = (userId: string, date: string, shiftId: string) => {
    setBulkAssignments(prev => {
      const userAssignments = { ...prev[userId] };
      if (shiftId === '') {
        delete userAssignments[date];
      } else {
        userAssignments[date] = shiftId;
      }
      return { ...prev, [userId]: userAssignments };
    });

    // Seteaza pozitia default daca nu exista
    if (shiftId !== '' && !bulkWorkPositions[userId]?.[date] && dbWorkPositions.length > 0) {
      const user = eligibleUsers.find(u => u.id === userId);
      const userDept = user?.department?.name?.toLowerCase() || '';
      let defaultPositionId = dbWorkPositions[0].id;

      if (userDept.includes('control')) {
        const controlPos = dbWorkPositions.find(p => p.name.toLowerCase().includes('control'));
        if (controlPos) defaultPositionId = controlPos.id;
      } else {
        const dispeceratPos = dbWorkPositions.find(p => p.name.toLowerCase().includes('dispecerat'));
        if (dispeceratPos) defaultPositionId = dispeceratPos.id;
      }

      setBulkWorkPositions(prev => ({
        ...prev,
        [userId]: { ...(prev[userId] || {}), [date]: defaultPositionId }
      }));
    }
  };

  // Calculeaza statisticile pentru fiecare zi
  const dailyStats = useMemo(() => {
    const stats: Record<string, { total: number; byShift: Record<string, number> }> = {};

    calendarDays.forEach(({ date }) => {
      stats[date] = { total: 0, byShift: {} };

      selectedUserIds.forEach(userId => {
        const shiftId = bulkAssignments[userId]?.[date];
        if (shiftId && !shiftId.includes('vacation')) {
          stats[date].total++;
          if (!stats[date].byShift[shiftId]) {
            stats[date].byShift[shiftId] = 0;
          }
          stats[date].byShift[shiftId]++;
        }
      });
    });

    return stats;
  }, [calendarDays, selectedUserIds, bulkAssignments]);

  // Gaseste scheduleId-ul existent pentru un user
  const getExistingScheduleId = (userId: string): string | null => {
    for (const schedule of existingSchedules) {
      if (schedule.assignments?.some(a => a.userId === userId)) {
        return schedule.id;
      }
    }
    return null;
  };

  // Salveaza toate programele
  const handleSaveAll = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      setSavingProgress({ current: 0, total: selectedUserIds.length });
      let savedCount = 0;
      let failedCount = 0;

      for (const userId of selectedUserIds) {
        const userAssignments = bulkAssignments[userId] || {};
        const userPositions = bulkWorkPositions[userId] || {};

        // Creeaza assignment DTOs pentru acest user
        const assignmentDtos: ScheduleAssignmentDto[] = [];

        Object.entries(userAssignments).forEach(([date, localShiftId]) => {
          const shiftOption = shiftOptions.find(s => s.id === localShiftId);
          const dbShiftTypeId = getShiftTypeId(localShiftId);

          if (dbShiftTypeId) {
            const assignment: ScheduleAssignmentDto = {
              userId,
              shiftTypeId: dbShiftTypeId,
              shiftDate: date,
              notes: shiftOption?.isVacation ? 'Concediu' : `${shiftOption?.startTime}-${shiftOption?.endTime}`,
            };

            if (userPositions[date] && dbWorkPositions.some(p => p.id === userPositions[date])) {
              assignment.workPositionId = userPositions[date];
            }

            assignmentDtos.push(assignment);
          }
        });

        if (assignmentDtos.length === 0) {
          setSavingProgress(prev => prev ? { ...prev, current: prev.current + 1 } : null);
          continue;
        }

        try {
          const existingScheduleId = getExistingScheduleId(userId);
          const user = eligibleUsers.find(u => u.id === userId);

          if (existingScheduleId) {
            await updateSchedule({
              id: existingScheduleId,
              data: {
                assignments: assignmentDtos,
                status: (isAdmin ? 'APPROVED' : 'DRAFT') as ScheduleStatus,
              }
            }).unwrap();
          } else {
            await createSchedule({
              monthYear,
              assignments: assignmentDtos,
              notes: `Program pentru ${user?.fullName || 'utilizator'} - Tura ${shiftPattern}`,
              status: (isAdmin ? 'APPROVED' : 'DRAFT') as ScheduleStatus,
            }).unwrap();
          }
          savedCount++;
        } catch (err) {
          console.error(`Failed to save schedule for user ${userId}:`, err);
          failedCount++;
        }

        setSavingProgress(prev => prev ? { ...prev, current: prev.current + 1 } : null);
      }

      setSavingProgress(null);

      if (failedCount === 0) {
        setSuccessMessage(`Toate cele ${savedCount} programe au fost salvate cu succes!`);
      } else {
        setErrorMessage(`${savedCount} programe salvate, ${failedCount} erori.`);
      }

      // Reincarca datele
      refetchSchedules();

      setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);

    } catch (err) {
      console.error('Failed to save schedules:', err);
      setErrorMessage('A aparut o eroare la salvarea programelor.');
      setSavingProgress(null);
    }
  };

  // Obtine info pentru tura (culoare, label)
  const getShiftInfo = (localShiftId: string) => {
    const shift = shiftOptions.find(s => s.id === localShiftId);
    return shift ? { label: shift.shortLabel, color: shift.color } : null;
  };

  // ===== ACTIUNI RAPIDE =====

  // 1. Aplica tura la toti utilizatorii selectati pentru o zi specifica
  const handleApplyShiftToDay = () => {
    if (!selectedDay || !selectedShiftForAction) return;

    selectedUserIds.forEach(userId => {
      handleShiftChange(userId, selectedDay, selectedShiftForAction);
    });

    setQuickActionDialog(null);
    setSelectedDay(null);
    setSelectedShiftForAction('');
    setSuccessMessage(`Tura aplicata pentru ${selectedUserIds.length} angajati in ziua selectata.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // 2. Aplica tura pe toata saptamana (7 zile de la data selectata)
  const handleApplyShiftToWeek = () => {
    if (!selectedWeekStart || !selectedShiftForAction) return;

    const startDate = new Date(selectedWeekStart);
    const dates: string[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      // Verifica daca data e in luna curenta
      if (calendarDays.some(d => d.date === dateStr)) {
        dates.push(dateStr);
      }
    }

    selectedUserIds.forEach(userId => {
      dates.forEach(date => {
        handleShiftChange(userId, date, selectedShiftForAction);
      });
    });

    setQuickActionDialog(null);
    setSelectedWeekStart('');
    setSelectedShiftForAction('');
    setSuccessMessage(`Tura aplicata pe ${dates.length} zile pentru ${selectedUserIds.length} angajati.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // 3. Copiaza programul de la un angajat la altii
  const handleCopySchedule = () => {
    if (!copySourceUserId || copyTargetUserIds.length === 0) return;

    const sourceAssignments = bulkAssignments[copySourceUserId] || {};
    const sourcePositions = bulkWorkPositions[copySourceUserId] || {};

    copyTargetUserIds.forEach(targetUserId => {
      // Copiaza toate asignarile
      Object.entries(sourceAssignments).forEach(([date, shiftId]) => {
        handleShiftChange(targetUserId, date, shiftId);
      });

      // Copiaza pozitiile
      setBulkWorkPositions(prev => ({
        ...prev,
        [targetUserId]: { ...sourcePositions }
      }));
    });

    setQuickActionDialog(null);
    setCopySourceUserId('');
    setCopyTargetUserIds([]);
    setSuccessMessage(`Programul copiat la ${copyTargetUserIds.length} angajati.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // 4. Aplica un template de program
  const handleApplyTemplate = (template: { pattern: string[] }) => {
    if (selectedUserIds.length === 0) return;

    selectedUserIds.forEach(userId => {
      let patternIndex = 0;
      calendarDays.forEach(({ date }) => {
        const shiftId = template.pattern[patternIndex % template.pattern.length];
        handleShiftChange(userId, date, shiftId);
        patternIndex++;
      });
    });

    setQuickActionDialog(null);
    setSuccessMessage(`Template aplicat pentru ${selectedUserIds.length} angajati.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Handler pentru click pe header de zi (pentru aplicare rapida)
  const handleDayHeaderClick = (date: string) => {
    setSelectedDay(date);
    setQuickActionDialog('apply_day');
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 } }}>
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/schedules')}
            variant="outlined"
            size="small"
          >
            Inapoi
          </Button>
          <Box sx={{ flex: 1 }}>
            <Typography variant={isMobile ? 'h6' : 'h5'}>
              Programare in Masa
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Editeaza programul pentru mai multi angajati simultan
            </Typography>
          </Box>
        </Stack>

        {/* Alerts */}
        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {/* Selectori - Luna si Tip Tura */}
        <Card>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Luna</InputLabel>
                <Select
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                  label="Luna"
                >
                  {monthOptions.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Tip Tura</InputLabel>
                <Select
                  value={shiftPattern}
                  onChange={(e) => setShiftPattern(e.target.value as ShiftPatternType)}
                  label="Tip Tura"
                >
                  <MenuItem value="12H">Tura 12 ore</MenuItem>
                  <MenuItem value="8H">Tura 8 ore</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ flex: 1 }} />

              <Chip
                icon={<GroupIcon />}
                label={`${selectedUserIds.length} / ${eligibleUsers.length} selectati`}
                color="primary"
                variant="outlined"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Selector Utilizatori */}
        <Card>
          <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                Selecteaza Angajatii
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  startIcon={<SelectAllIcon />}
                  onClick={handleSelectAll}
                  variant={selectedUserIds.length === eligibleUsers.length ? 'contained' : 'outlined'}
                >
                  {selectedUserIds.length === eligibleUsers.length ? 'Deselecteaza Toti' : 'Selecteaza Toti'}
                </Button>
                <IconButton size="small" onClick={() => setShowUserSelector(!showUserSelector)}>
                  {showUserSelector ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Stack>
            </Stack>

            <Collapse in={showUserSelector}>
              <Stack spacing={1.5}>
                {Object.entries(usersByDepartment).map(([deptName, deptUsers]) => {
                  const deptUserIds = deptUsers.map(u => u.id);
                  const selectedInDept = deptUserIds.filter(id => selectedUserIds.includes(id)).length;
                  const allSelected = selectedInDept === deptUserIds.length;
                  const someSelected = selectedInDept > 0 && !allSelected;

                  return (
                    <Paper key={deptName} variant="outlined" sx={{ p: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={() => handleDepartmentToggle(deptName)}
                          size="small"
                        />
                        <Typography variant="subtitle2" fontWeight="bold">
                          {deptName}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${selectedInDept}/${deptUsers.length}`}
                          color={allSelected ? 'success' : someSelected ? 'warning' : 'default'}
                        />
                      </Stack>
                      <FormGroup row sx={{ pl: 4, flexWrap: 'wrap', gap: 0.5 }}>
                        {deptUsers.map(user => (
                          <FormControlLabel
                            key={user.id}
                            control={
                              <Checkbox
                                checked={selectedUserIds.includes(user.id)}
                                onChange={() => handleUserToggle(user.id)}
                                size="small"
                              />
                            }
                            label={
                              <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                {user.fullName}
                              </Typography>
                            }
                            sx={{ m: 0, mr: 2 }}
                          />
                        ))}
                      </FormGroup>
                    </Paper>
                  );
                })}
              </Stack>
            </Collapse>
          </CardContent>
        </Card>

        {/* Legenda */}
        <Paper sx={{ p: { xs: 1, sm: 1.5 }, overflowX: 'auto' }}>
          <Stack
            direction="row"
            spacing={{ xs: 0.5, sm: 1 }}
            flexWrap="wrap"
            alignItems="center"
            sx={{ gap: { xs: 0.5, sm: 1 } }}
          >
            <Typography variant="caption" fontWeight="bold" sx={{ mr: 1, whiteSpace: 'nowrap' }}>
              Legenda ({shiftPattern}):
            </Typography>
            {shiftOptions.map((option) => (
              <Chip
                key={option.id}
                label={isMobile ? option.shortLabel : `${option.shortLabel} - ${option.label}`}
                size="small"
                sx={{
                  bgcolor: option.color,
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  height: { xs: 20, sm: 24 },
                }}
              />
            ))}
            <Chip
              label="L - Liber"
              variant="outlined"
              size="small"
              sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, height: { xs: 20, sm: 24 } }}
            />
          </Stack>
        </Paper>

        {/* Actiuni Rapide */}
        {selectedUserIds.length > 0 && (
          <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <FlashOnIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                  Actiuni Rapide
                </Typography>
              </Stack>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                flexWrap="wrap"
                sx={{ '& > button': { flex: { xs: '1 1 100%', sm: '0 0 auto' } } }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<TodayIcon />}
                  onClick={() => setQuickActionDialog('apply_day')}
                  fullWidth={isMobile}
                >
                  {isMobile ? 'Tura/Zi' : 'Aplica Tura pe Zi'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DateRangeIcon />}
                  onClick={() => setQuickActionDialog('apply_week')}
                  fullWidth={isMobile}
                >
                  {isMobile ? 'Tura/Saptamana' : 'Aplica Tura pe Saptamana'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => setQuickActionDialog('copy')}
                  fullWidth={isMobile}
                >
                  {isMobile ? 'Copiaza' : 'Copiaza Program'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlaylistAddIcon />}
                  onClick={() => setQuickActionDialog('template')}
                  fullWidth={isMobile}
                >
                  {isMobile ? 'Template' : 'Aplica Template'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Tabel principal */}
        {selectedUserIds.length > 0 ? (
          <Card sx={{ overflow: 'hidden' }}>
            <CardContent sx={{ p: 0 }}>
              <TableContainer sx={{ maxHeight: { xs: 'calc(100vh - 500px)', sm: 'calc(100vh - 450px)' }, minHeight: { xs: 250, sm: 300 } }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    {/* Rand cu statistici pe zi */}
                    <TableRow>
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          bgcolor: 'grey.200',
                          zIndex: 4,
                          minWidth: 150,
                          fontWeight: 'bold',
                          fontSize: '0.7rem',
                        }}
                      >
                        Total pe zi
                      </TableCell>
                      {calendarDays.map(({ day, date, isWeekend }) => {
                        const stats = dailyStats[date];
                        return (
                          <TableCell
                            key={day}
                            align="center"
                            sx={{
                              p: 0.3,
                              minWidth: 45,
                              bgcolor: isWeekend ? 'grey.300' : 'grey.200',
                              fontWeight: 'bold',
                            }}
                          >
                            <Tooltip
                              title={
                                <Box>
                                  {Object.entries(stats?.byShift || {}).map(([shiftId, count]) => {
                                    const shift = shiftOptions.find(s => s.id === shiftId);
                                    return (
                                      <Typography key={shiftId} variant="caption" display="block">
                                        {shift?.shortLabel}: {count}
                                      </Typography>
                                    );
                                  })}
                                </Box>
                              }
                              arrow
                            >
                              <Badge
                                badgeContent={stats?.total || 0}
                                color={stats?.total > 0 ? 'primary' : 'default'}
                                max={99}
                              >
                                <CheckCircleIcon
                                  sx={{
                                    fontSize: 16,
                                    color: stats?.total > 0 ? 'success.main' : 'grey.400',
                                  }}
                                />
                              </Badge>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>

                    {/* Rand cu header zile */}
                    <TableRow>
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          bgcolor: 'background.paper',
                          zIndex: 4,
                          minWidth: 150,
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                        }}
                      >
                        Angajat
                      </TableCell>
                      {calendarDays.map(({ day, date, dayOfWeek, isWeekend }) => (
                        <Tooltip key={day} title="Click pentru a aplica tura rapida" arrow>
                          <TableCell
                            align="center"
                            onClick={() => handleDayHeaderClick(date)}
                            sx={{
                              p: 0.3,
                              minWidth: 45,
                              bgcolor: isWeekend ? 'grey.200' : 'background.paper',
                              fontWeight: 'bold',
                              fontSize: '0.65rem',
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: 'primary.50',
                              },
                            }}
                          >
                            <Box>
                              <Typography sx={{ fontSize: '0.55rem', color: isWeekend ? 'error.main' : 'text.secondary' }}>
                                {dayOfWeek}
                              </Typography>
                              <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                                {day}
                              </Typography>
                            </Box>
                          </TableCell>
                        </Tooltip>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {selectedUserIds.map(userId => {
                      const user = eligibleUsers.find(u => u.id === userId);
                      if (!user) return null;

                      return (
                        <TableRow key={userId} hover>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              left: 0,
                              bgcolor: 'background.paper',
                              zIndex: 1,
                              p: 0.5,
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                                {user.fullName.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                                  {user.fullName}
                                </Typography>
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                  {user.department?.name || '-'}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>

                          {calendarDays.map(({ date, isWeekend }) => {
                            const currentShift = bulkAssignments[userId]?.[date] || '';
                            const shiftInfo = currentShift ? getShiftInfo(currentShift) : null;

                            return (
                              <TableCell
                                key={date}
                                align="center"
                                sx={{
                                  p: 0.2,
                                  bgcolor: shiftInfo?.color || (isWeekend ? 'grey.100' : 'transparent'),
                                  border: '1px solid',
                                  borderColor: 'divider',
                                }}
                              >
                                <Select
                                  value={currentShift}
                                  onChange={(e) => handleShiftChange(userId, date, e.target.value)}
                                  displayEmpty
                                  size="small"
                                  sx={{
                                    fontSize: '0.6rem',
                                    minWidth: 35,
                                    '& .MuiSelect-select': {
                                      py: 0.2,
                                      px: 0.3,
                                      color: shiftInfo ? 'white' : 'inherit',
                                      fontWeight: shiftInfo ? 'bold' : 'normal',
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      border: 'none',
                                    },
                                  }}
                                >
                                  <MenuItem value="" sx={{ fontSize: '0.75rem' }}>
                                    <em>-</em>
                                  </MenuItem>
                                  {shiftOptions.map((option) => (
                                    <MenuItem
                                      key={option.id}
                                      value={option.id}
                                      sx={{
                                        fontSize: '0.75rem',
                                        bgcolor: option.color,
                                        color: 'white',
                                        '&:hover': { bgcolor: option.color, opacity: 0.9 },
                                        '&.Mui-selected': { bgcolor: option.color },
                                      }}
                                    >
                                      {option.shortLabel}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info">
            Selecteaza cel putin un angajat pentru a edita programul.
          </Alert>
        )}

        {/* Buton salvare */}
        {selectedUserIds.length > 0 && (
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={{ xs: 1.5, sm: 0 }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    <strong>{selectedUserIds.length}</strong> angajati |
                    {!isMobile && ' Luna:'} <strong>{monthOptions.find(m => m.value === monthYear)?.label}</strong>
                  </Typography>
                  {savingProgress && (
                    <Typography variant="caption" color="text.secondary">
                      Salvare: {savingProgress.current} / {savingProgress.total}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1} justifyContent={{ xs: 'stretch', sm: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/schedules')}
                    size={isMobile ? 'small' : 'medium'}
                    sx={{ flex: { xs: 1, sm: 'none' } }}
                  >
                    Anuleaza
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={savingProgress ? <CircularProgress size={16} /> : <SaveIcon />}
                    onClick={handleSaveAll}
                    disabled={!!savingProgress}
                    size={isMobile ? 'small' : 'medium'}
                    sx={{ flex: { xs: 2, sm: 'none' } }}
                  >
                    {savingProgress ? 'Salvare...' : (isMobile ? `Salveaza (${selectedUserIds.length})` : `Salveaza Toate (${selectedUserIds.length})`)}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* ===== DIALOGURI ACTIUNI RAPIDE ===== */}

      {/* Dialog: Aplica Tura pe Zi */}
      <Dialog
        open={quickActionDialog === 'apply_day'}
        onClose={() => { setQuickActionDialog(null); setSelectedDay(null); setSelectedShiftForAction(''); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TodayIcon color="primary" />
            <Typography variant="h6">Aplica Tura pe Zi</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Selecteaza ziua si tura pentru a o aplica la toti cei {selectedUserIds.length} angajati selectati.
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Ziua</InputLabel>
              <Select
                value={selectedDay || ''}
                onChange={(e) => setSelectedDay(e.target.value)}
                label="Ziua"
              >
                {calendarDays.map(({ day, date, dayOfWeek, isWeekend }) => (
                  <MenuItem key={date} value={date}>
                    {day} {dayOfWeek} {isWeekend ? '(weekend)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Tura</InputLabel>
              <Select
                value={selectedShiftForAction}
                onChange={(e) => setSelectedShiftForAction(e.target.value)}
                label="Tura"
              >
                <MenuItem value="">
                  <em>Liber (sterge tura)</em>
                </MenuItem>
                {shiftOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: option.color,
                        }}
                      />
                      <Typography>{option.label}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setQuickActionDialog(null); setSelectedDay(null); setSelectedShiftForAction(''); }}>
            Anuleaza
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyShiftToDay}
            disabled={!selectedDay}
          >
            Aplica
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Aplica Tura pe Saptamana */}
      <Dialog
        open={quickActionDialog === 'apply_week'}
        onClose={() => { setQuickActionDialog(null); setSelectedWeekStart(''); setSelectedShiftForAction(''); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DateRangeIcon color="primary" />
            <Typography variant="h6">Aplica Tura pe Saptamana</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Selecteaza prima zi a saptamanii si tura. Tura va fi aplicata pentru 7 zile consecutive.
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Prima zi din saptamana</InputLabel>
              <Select
                value={selectedWeekStart}
                onChange={(e) => setSelectedWeekStart(e.target.value)}
                label="Prima zi din saptamana"
              >
                {calendarDays.slice(0, -6).map(({ day, date, dayOfWeek }) => (
                  <MenuItem key={date} value={date}>
                    {day} {dayOfWeek} - {day + 6 <= daysInMonth ? day + 6 : daysInMonth} (7 zile)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Tura</InputLabel>
              <Select
                value={selectedShiftForAction}
                onChange={(e) => setSelectedShiftForAction(e.target.value)}
                label="Tura"
              >
                <MenuItem value="">
                  <em>Liber (sterge turele)</em>
                </MenuItem>
                {shiftOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: option.color,
                        }}
                      />
                      <Typography>{option.label}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setQuickActionDialog(null); setSelectedWeekStart(''); setSelectedShiftForAction(''); }}>
            Anuleaza
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyShiftToWeek}
            disabled={!selectedWeekStart}
          >
            Aplica pe 7 Zile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Copiaza Program */}
      <Dialog
        open={quickActionDialog === 'copy'}
        onClose={() => { setQuickActionDialog(null); setCopySourceUserId(''); setCopyTargetUserIds([]); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ContentCopyIcon color="primary" />
            <Typography variant="h6">Copiaza Program</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Copiaza programul unui angajat la alti angajati selectati.
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Copiaza de la</InputLabel>
              <Select
                value={copySourceUserId}
                onChange={(e) => setCopySourceUserId(e.target.value)}
                label="Copiaza de la"
              >
                {selectedUserIds.map(userId => {
                  const user = eligibleUsers.find(u => u.id === userId);
                  return (
                    <MenuItem key={userId} value={userId}>
                      {user?.fullName} ({user?.department?.name})
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <Divider />

            <Typography variant="subtitle2">Copiaza la:</Typography>
            <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
              <List dense>
                {selectedUserIds
                  .filter(id => id !== copySourceUserId)
                  .map(userId => {
                    const user = eligibleUsers.find(u => u.id === userId);
                    const isSelected = copyTargetUserIds.includes(userId);
                    return (
                      <ListItem key={userId} disablePadding>
                        <ListItemButton
                          onClick={() => {
                            setCopyTargetUserIds(prev =>
                              isSelected
                                ? prev.filter(id => id !== userId)
                                : [...prev, userId]
                            );
                          }}
                        >
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={isSelected}
                              tabIndex={-1}
                              disableRipple
                              size="small"
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={user?.fullName}
                            secondary={user?.department?.name}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
              </List>
            </Paper>

            <Button
              size="small"
              onClick={() => {
                const allOthers = selectedUserIds.filter(id => id !== copySourceUserId);
                setCopyTargetUserIds(
                  copyTargetUserIds.length === allOthers.length ? [] : allOthers
                );
              }}
            >
              {copyTargetUserIds.length === selectedUserIds.filter(id => id !== copySourceUserId).length
                ? 'Deselecteaza Toti'
                : 'Selecteaza Toti'}
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setQuickActionDialog(null); setCopySourceUserId(''); setCopyTargetUserIds([]); }}>
            Anuleaza
          </Button>
          <Button
            variant="contained"
            onClick={handleCopySchedule}
            disabled={!copySourceUserId || copyTargetUserIds.length === 0}
          >
            Copiaza ({copyTargetUserIds.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Aplica Template */}
      <Dialog
        open={quickActionDialog === 'template'}
        onClose={() => setQuickActionDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PlaylistAddIcon color="primary" />
            <Typography variant="h6">Aplica Template de Program</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Selecteaza un template care se va repeta pentru toata luna.
              Se aplica la toti cei {selectedUserIds.length} angajati selectati.
            </Typography>

            <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
              Template-ul se repeta ciclic: dupa ultimul element, revine la primul.
            </Alert>

            <List>
              {SHIFT_TEMPLATES.map((template) => (
                <Paper key={template.id} variant="outlined" sx={{ mb: 1 }}>
                  <ListItemButton onClick={() => handleApplyTemplate(template)}>
                    <ListItemText
                      primary={template.name}
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Stack direction="row" spacing={0.5} mt={0.5}>
                          {template.pattern.map((shiftId, idx) => {
                            const shift = shiftOptions.find(s => s.id === shiftId);
                            return (
                              <Chip
                                key={idx}
                                label={shift?.shortLabel || 'L'}
                                size="small"
                                sx={{
                                  bgcolor: shift?.color || 'grey.300',
                                  color: shift ? 'white' : 'inherit',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem',
                                  height: 22,
                                  minWidth: 28,
                                }}
                              />
                            );
                          })}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </Paper>
              ))}
            </List>

            <Divider />

            <Typography variant="subtitle2">Template personalizat:</Typography>
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="wrap"
              sx={{ gap: { xs: 0.5, sm: 0.5 }, '& > *': { mb: { xs: 0.5, sm: 0 } } }}
            >
              {Array.from({ length: 7 }).map((_, idx) => (
                <FormControl key={idx} size="small" sx={{ width: { xs: 60, sm: 70 }, minWidth: { xs: 60, sm: 70 } }}>
                  <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '1rem' } }}>Zi {idx + 1}</InputLabel>
                  <Select
                    value={templatePattern[idx] || ''}
                    onChange={(e) => {
                      const newPattern = [...templatePattern];
                      newPattern[idx] = e.target.value;
                      setTemplatePattern(newPattern);
                    }}
                    label={`Zi ${idx + 1}`}
                    sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }}
                  >
                    <MenuItem value="">L</MenuItem>
                    {shiftOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.shortLabel}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </Stack>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => {
                if (templatePattern.length > 0) {
                  handleApplyTemplate({ pattern: templatePattern });
                }
              }}
              disabled={templatePattern.length === 0 || templatePattern.every(p => !p)}
            >
              Aplica Template Personalizat
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setQuickActionDialog(null); setTemplatePattern([]); }}>
            Inchide
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BulkSchedulePage;
