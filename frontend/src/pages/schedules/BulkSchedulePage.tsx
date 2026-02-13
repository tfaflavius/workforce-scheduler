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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SelectAll as SelectAllIcon,
  CheckCircle as CheckCircleIcon,
  Group as GroupIcon,
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

// Opțiuni pentru tura de 12 ore
const SHIFT_OPTIONS_12H: ShiftOption[] = [
  { id: 'day_12', label: 'Zi 07-19', shortLabel: 'Z', startTime: '07:00', endTime: '19:00', color: '#4CAF50', isNightShift: false, isVacation: false },
  { id: 'night_12', label: 'Noapte 19-07', shortLabel: 'N', startTime: '19:00', endTime: '07:00', color: '#3F51B5', isNightShift: true, isVacation: false },
  { id: 'vacation_12', label: 'Concediu', shortLabel: 'CO', startTime: '', endTime: '', color: '#FF9800', isNightShift: false, isVacation: true },
];

// Opțiuni pentru tura de 8 ore
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

// Generează lista de luni pentru anul 2026
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

  // Asignări: { oderId: { date: localShiftId } }
  const [bulkAssignments, setBulkAssignments] = useState<Record<string, Record<string, string>>>({});
  // Poziții de lucru: { oderId: { date: workPositionId } }
  const [bulkWorkPositions, setBulkWorkPositions] = useState<Record<string, Record<string, string>>>({});

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState<{ current: number; total: number } | null>(null);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // API hooks
  const { data: users = [], isLoading: usersLoading } = useGetUsersQuery({ isActive: true });
  const { data: existingSchedules = [], isLoading: schedulesLoading, refetch: refetchSchedules } = useGetSchedulesQuery({ monthYear });
  const { data: dbShiftTypes = [] } = useGetShiftTypesQuery();
  const { data: dbWorkPositions = [] } = useGetWorkPositionsQuery();
  const { data: approvedLeaves = [] } = useGetApprovedLeavesByMonthQuery(monthYear);
  const [createSchedule] = useCreateScheduleMutation();
  const [updateSchedule] = useUpdateScheduleMutation();

  // Filtrăm angajații și managerii, sortăm după departament
  const eligibleUsers = useMemo(() => {
    const filtered = users.filter(u => u.role === 'USER' || u.role === 'MANAGER');
    const departmentOrder: Record<string, number> = {
      'Dispecerat': 1,
      'Control': 2,
      'Întreținere': 3,
      'Intretinere': 3,
    };
    filtered.sort((a, b) => {
      const orderA = departmentOrder[a.department?.name || ''] || 99;
      const orderB = departmentOrder[b.department?.name || ''] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.fullName.localeCompare(b.fullName);
    });
    return filtered;
  }, [users]);

  // Grupează utilizatorii pe departamente
  const usersByDepartment = useMemo(() => {
    const groups: Record<string, typeof eligibleUsers> = {};
    eligibleUsers.forEach(user => {
      const dept = user.department?.name || 'Fără Departament';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(user);
    });
    return groups;
  }, [eligibleUsers]);

  // Opțiunile de tură
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

  // Încarcă asignările existente pentru toți utilizatorii selectați
  useEffect(() => {
    if (schedulesLoading || selectedUserIds.length === 0) return;

    const loadedAssignments: Record<string, Record<string, string>> = {};
    const loadedPositions: Record<string, Record<string, string>> = {};

    selectedUserIds.forEach(userId => {
      loadedAssignments[userId] = {};
      loadedPositions[userId] = {};

      // Găsește asignările din schedule-uri existente
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

      // Adaugă concediile aprobate
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

  // Handler pentru selecția unui user
  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handler pentru selecția unui departament întreg
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

  // Handler pentru selecția tuturor
  const handleSelectAll = () => {
    if (selectedUserIds.length === eligibleUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(eligibleUsers.map(u => u.id));
    }
  };

  // Handler pentru schimbarea turei unui user într-o zi
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

    // Setează poziția default dacă nu există
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

  // Calculează statisticile pentru fiecare zi
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

  // Găsește scheduleId-ul existent pentru un user
  const getExistingScheduleId = (userId: string): string | null => {
    for (const schedule of existingSchedules) {
      if (schedule.assignments?.some(a => a.userId === userId)) {
        return schedule.id;
      }
    }
    return null;
  };

  // Salvează toate programele
  const handleSaveAll = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      setSavingProgress({ current: 0, total: selectedUserIds.length });
      let savedCount = 0;
      let failedCount = 0;

      for (const userId of selectedUserIds) {
        const userAssignments = bulkAssignments[userId] || {};
        const userPositions = bulkWorkPositions[userId] || {};

        // Creează assignment DTOs pentru acest user
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

      // Reîncarcă datele
      refetchSchedules();

      setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);

    } catch (err) {
      console.error('Failed to save schedules:', err);
      setErrorMessage('A apărut o eroare la salvarea programelor.');
      setSavingProgress(null);
    }
  };

  // Obține info pentru tură (culoare, label)
  const getShiftInfo = (localShiftId: string) => {
    const shift = shiftOptions.find(s => s.id === localShiftId);
    return shift ? { label: shift.shortLabel, color: shift.color } : null;
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
            Înapoi
          </Button>
          <Box sx={{ flex: 1 }}>
            <Typography variant={isMobile ? 'h6' : 'h5'}>
              Programare în Masă
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Editează programul pentru mai mulți angajați simultan
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

        {/* Selectori - Lună și Tip Tură */}
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
                <InputLabel>Tip Tură</InputLabel>
                <Select
                  value={shiftPattern}
                  onChange={(e) => setShiftPattern(e.target.value as ShiftPatternType)}
                  label="Tip Tură"
                >
                  <MenuItem value="12H">Tură 12 ore</MenuItem>
                  <MenuItem value="8H">Tură 8 ore</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ flex: 1 }} />

              <Chip
                icon={<GroupIcon />}
                label={`${selectedUserIds.length} / ${eligibleUsers.length} selectați`}
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
                Selectează Angajații
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  startIcon={<SelectAllIcon />}
                  onClick={handleSelectAll}
                  variant={selectedUserIds.length === eligibleUsers.length ? 'contained' : 'outlined'}
                >
                  {selectedUserIds.length === eligibleUsers.length ? 'Deselectează Toți' : 'Selectează Toți'}
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

        {/* Legendă */}
        <Paper sx={{ p: 1.5 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
              Legendă ({shiftPattern}):
            </Typography>
            {shiftOptions.map((option) => (
              <Chip
                key={option.id}
                label={`${option.shortLabel} - ${option.label}`}
                size="small"
                sx={{
                  bgcolor: option.color,
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
            ))}
            <Chip
              label="L - Liber"
              variant="outlined"
              size="small"
              sx={{ fontSize: '0.7rem', height: 24 }}
            />
          </Stack>
        </Paper>

        {/* Tabel principal */}
        {selectedUserIds.length > 0 ? (
          <Card sx={{ overflow: 'hidden' }}>
            <CardContent sx={{ p: 0 }}>
              <TableContainer sx={{ maxHeight: 'calc(100vh - 450px)', minHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    {/* Rând cu statistici pe zi */}
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

                    {/* Rând cu header zile */}
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
                      {calendarDays.map(({ day, dayOfWeek, isWeekend }) => (
                        <TableCell
                          key={day}
                          align="center"
                          sx={{
                            p: 0.3,
                            minWidth: 45,
                            bgcolor: isWeekend ? 'grey.200' : 'background.paper',
                            fontWeight: 'bold',
                            fontSize: '0.65rem',
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
            Selectează cel puțin un angajat pentru a edita programul.
          </Alert>
        )}

        {/* Buton salvare */}
        {selectedUserIds.length > 0 && (
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2">
                    <strong>{selectedUserIds.length}</strong> angajați selectați |
                    Lună: <strong>{monthOptions.find(m => m.value === monthYear)?.label}</strong>
                  </Typography>
                  {savingProgress && (
                    <Typography variant="caption" color="text.secondary">
                      Salvare: {savingProgress.current} / {savingProgress.total}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/schedules')}
                  >
                    Anulează
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={savingProgress ? <CircularProgress size={16} /> : <SaveIcon />}
                    onClick={handleSaveAll}
                    disabled={!!savingProgress}
                  >
                    {savingProgress ? 'Salvare...' : `Salvează Toate (${selectedUserIds.length})`}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
};

export default BulkSchedulePage;
