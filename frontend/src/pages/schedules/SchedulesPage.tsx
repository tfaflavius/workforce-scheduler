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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  alpha,
  Grow,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  CalendarMonth as CalendarMonthIcon,
  FilterList as FilterIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  HourglassEmpty as PendingIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  EventBusy as EventBusyIcon,
  CheckCircle as ApprovedIcon,
} from '@mui/icons-material';
import { GradientHeader, EmptyState } from '../../components/common';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useGetApprovedLeavesByMonthQuery } from '../../store/api/leaveRequests.api';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

// Genereaza lista de luni pentru anul 2026 (toate cele 12 luni)
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

// Tipuri de filtre
type ShiftFilter = 'ALL' | '12H' | '8H' | 'VACATION' | 'FREE';
type DayFilter = 'ALL' | string; // 'ALL' sau numarul zilei (1-31)
type WorkPositionFilter = 'ALL' | string; // 'ALL' sau ID-ul pozitiei de lucru

const SchedulesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filtering state
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [dayFilter, setDayFilter] = useState<DayFilter>('ALL');
  const [workPositionFilter, setWorkPositionFilter] = useState<WorkPositionFilter>('ALL');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Legend collapse state (collapsed by default on mobile)
  const [legendExpanded, setLegendExpanded] = useState(!isMobile);

  // Lista de luni (generata o singura data)
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const { data: schedules = [], isLoading, error } = useGetSchedulesQuery({
    monthYear: selectedMonth,
  });
  const { data: users = [] } = useGetUsersQuery({ isActive: true });
  const { data: approvedLeaves = [] } = useGetApprovedLeavesByMonthQuery(selectedMonth);

  // Verifica daca utilizatorul curent este admin
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';

  // Filtram doar angajatii si managerii
  const eligibleUsers = useMemo(() => {
    return users.filter(u => u.role === 'USER' || u.role === 'MANAGER');
  }, [users]);

  // Extrage lista unica de departamente
  const departments = useMemo(() => {
    const deptMap = new Map<string, string>();
    eligibleUsers.forEach(u => {
      if (u.department) {
        deptMap.set(u.department.id, u.department.name);
      }
    });
    return Array.from(deptMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [eligibleUsers]);

  // Extrage lista unica de pozitii de lucru (Dispecerat, Control, etc.)
  const workPositions = useMemo(() => {
    const posMap = new Map<string, { id: string; name: string; shortName?: string; color?: string }>();
    schedules.forEach(schedule => {
      if (schedule.assignments) {
        schedule.assignments.forEach(assignment => {
          if (assignment.workPosition) {
            posMap.set(assignment.workPosition.id, {
              id: assignment.workPosition.id,
              name: assignment.workPosition.name,
              shortName: assignment.workPosition.shortName,
              color: assignment.workPosition.color,
            });
          }
        });
      }
    });
    return Array.from(posMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules]);

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

  // Creeaza un map cu toate asignarile existente pentru toti angajatii
  // Include si statusul programului si pozitia de lucru
  // Include si concediile aprobate care nu au inca asignari
  const allUsersAssignments = useMemo(() => {
    const userAssignmentsMap: Record<string, {
      assignments: Record<string, { shiftId: string; notes: string; workPosition?: { shortName?: string; name?: string; color?: string }; isApprovedLeave?: boolean }>;
      scheduleId?: string;
      status?: string;
    }> = {};

    // Mai intai, adauga concediile aprobate pentru aceasta luna
    approvedLeaves.forEach(leave => {
      if (!userAssignmentsMap[leave.userId]) {
        userAssignmentsMap[leave.userId] = {
          assignments: {},
        };
      }
      leave.dates.forEach(date => {
        userAssignmentsMap[leave.userId].assignments[date] = {
          shiftId: 'vacation',
          notes: 'Concediu',
          isApprovedLeave: true,
        };
      });
    });

    // Apoi, adauga asignarile din programe (acestea suprascriu concediile daca exista)
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
          // shiftDate poate veni ca "2026-02-02" sau "2026-02-02T00:00:00.000Z"
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
  }, [schedules, approvedLeaves]);

  // Obtine info pentru o asignare existenta
  const getExistingShiftInfo = (notes: string) => {
    // Check for leave (concediu) - can be "Concediu" or "Concediu: Concediu de Odihna" etc.
    if (notes === 'Concediu' || notes?.startsWith('Concediu:') || notes?.includes('Concediu')) {
      return { label: 'CO', color: '#FF9800', type: 'VACATION' as const };
    }
    if (notes.includes('07:00-19:00')) {
      return { label: 'Z', color: '#4CAF50', type: '12H' as const };  // Verde
    }
    if (notes.includes('19:00-07:00')) {
      return { label: 'N', color: '#3F51B5', type: '12H' as const };  // Albastru inchis
    }
    if (notes.includes('07:30-15:30')) {
      return { label: 'Z3', color: '#795548', type: '8H' as const };  // Maro
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
      return { label: 'Z1', color: '#00BCD4', type: '8H' as const };  // Cyan
    }
    if (notes.includes('14:00-22:00')) {
      return { label: 'Z2', color: '#9C27B0', type: '8H' as const };  // Mov
    }
    if (notes.includes('22:00-06:00')) {
      return { label: 'N8', color: '#E91E63', type: '8H' as const };  // Roz
    }
    return { label: '-', color: '#9E9E9E', type: 'FREE' as const };
  };

  // Filtrare utilizatori
  const filteredUsers = useMemo(() => {
    let filtered = [...eligibleUsers];

    // Filtru dupa nume
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.fullName.toLowerCase().includes(query)
      );
    }

    // Filtru dupa departament
    if (departmentFilter !== 'ALL') {
      filtered = filtered.filter(user => user.department?.id === departmentFilter);
    }

    // Filtru dupa tipul de tura
    if (shiftFilter !== 'ALL') {
      filtered = filtered.filter(user => {
        const userAssignments = allUsersAssignments[user.id]?.assignments || {};
        const assignmentValues = Object.values(userAssignments);

        if (shiftFilter === 'FREE') {
          return assignmentValues.length === 0;
        }

        return assignmentValues.some(assignment => {
          const shiftInfo = getExistingShiftInfo(assignment.notes);
          return shiftInfo.type === shiftFilter;
        });
      });
    }

    // Filtru dupa zi specifica
    if (dayFilter !== 'ALL') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const targetDate = `${year}-${String(month).padStart(2, '0')}-${String(dayFilter).padStart(2, '0')}`;

      filtered = filtered.filter(user => {
        const userAssignments = allUsersAssignments[user.id]?.assignments || {};
        // Arata doar userii care au tura in ziua selectata
        return userAssignments[targetDate] !== undefined;
      });
    }

    // Filtru dupa pozitia de lucru (Dispecerat/Control)
    if (workPositionFilter !== 'ALL') {
      filtered = filtered.filter(user => {
        const userAssignments = allUsersAssignments[user.id]?.assignments || {};
        const assignmentValues = Object.values(userAssignments);

        // Arata userii care au cel putin o tura la pozitia selectata
        return assignmentValues.some(assignment =>
          assignment.workPosition?.shortName === workPositionFilter ||
          assignment.workPosition?.name === workPositionFilter
        );
      });
    }

    // Sortare dupa departament: Dispecerat → Control → Intretinere Parcari
    const departmentOrder: Record<string, number> = {
      'Dispecerat': 1,
      'Control': 2,
      'Intretinere Parcari': 3,
    };

    filtered.sort((a, b) => {
      const deptA = a.department?.name || '';
      const deptB = b.department?.name || '';

      const orderA = departmentOrder[deptA] || 99;
      const orderB = departmentOrder[deptB] || 99;

      // Prima sortare: dupa departament
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // A doua sortare: alfabetic dupa nume in cadrul aceluiasi departament
      return a.fullName.localeCompare(b.fullName);
    });

    return filtered;
  }, [eligibleUsers, searchQuery, departmentFilter, shiftFilter, dayFilter, workPositionFilter, selectedMonth, allUsersAssignments]);

  const handleCreateSchedule = () => {
    navigate('/schedules/create');
  };

  // Verifica daca utilizatorul poate edita programul
  const canEditSchedule = (targetUser: any) => {
    if (isAdmin) {
      // Admin poate edita orice program
      return true;
    }
    if (isManager && targetUser.role === 'USER') {
      // Manager poate edita programele angajatilor
      return true;
    }
    return false;
  };

  // Handler pentru editare
  const handleEditClick = (targetUser: any) => {
    setSelectedUser(targetUser);
    setEditDialogOpen(true);
  };

  // Navigheaza la pagina de editare
  const handleConfirmEdit = () => {
    if (selectedUser) {
      // Navigheaza la pagina de creare cu utilizatorul preselectat
      navigate(`/schedules/create?userId=${selectedUser.id}&month=${selectedMonth}`);
    }
    setEditDialogOpen(false);
  };

  // Obtine statusul programului pentru un utilizator
  const getScheduleStatus = (userId: string) => {
    return allUsersAssignments[userId]?.status;
  };

  // Render status chip
  const renderStatusChip = (status?: string) => {
    if (!status) return null;

    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <Chip
            icon={<PendingIcon />}
            label="Asteapta aprobare"
            size="small"
            color="warning"
            sx={{ height: 20, fontSize: '0.6rem' }}
          />
        );
      case 'APPROVED':
        return (
          <Chip
            icon={<CheckIcon />}
            label="Aprobat"
            size="small"
            color="success"
            sx={{ height: 20, fontSize: '0.6rem' }}
          />
        );
      case 'REJECTED':
        return (
          <Chip
            icon={<CloseIcon />}
            label="Respins"
            size="small"
            color="error"
            sx={{ height: 20, fontSize: '0.6rem' }}
          />
        );
      case 'DRAFT':
        return (
          <Chip
            label="Draft"
            size="small"
            color="default"
            sx={{ height: 20, fontSize: '0.6rem' }}
          />
        );
      default:
        return null;
    }
  };

  // Calculate stats for header
  const pendingCount = schedules.filter(s => s.status === 'PENDING_APPROVAL').length;
  const approvedCount = schedules.filter(s => s.status === 'APPROVED').length;
  const totalCount = schedules.length;

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || departmentFilter !== 'ALL' || shiftFilter !== 'ALL' || workPositionFilter !== 'ALL' || dayFilter !== 'ALL';

  // Handle reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('ALL');
    setShiftFilter('ALL');
    setWorkPositionFilter('ALL');
    setDayFilter('ALL');
  };

  // Get selected month label
  const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || '';

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={{ xs: 1.5, sm: 2 }}>
        {/* Header with Gradient */}
        <GradientHeader
          title="Programe de Lucru"
          subtitle={`${selectedMonthLabel}${isAdmin ? ' • Admin' : isManager ? ' • Manager' : ''}`}
          icon={<CalendarMonthIcon />}
          gradient="#2563eb 0%, #7c3aed 100%"
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              icon={<GroupIcon />}
              label={`${totalCount} programe`}
              size="small"
            />
            {pendingCount > 0 && (
              <Chip
                icon={<PendingIcon />}
                label={`${pendingCount} in asteptare`}
                size="small"
              />
            )}
            <Chip
              icon={<ApprovedIcon />}
              label={`${approvedCount} aprobate`}
              size="small"
            />
          </Stack>
        </GradientHeader>

        {/* Create Buttons */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent={{ xs: 'stretch', sm: 'flex-end' }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<GroupIcon />}
            onClick={() => navigate('/schedules/bulk')}
            fullWidth={isMobile}
            size={isMobile ? 'medium' : 'large'}
            sx={{
              px: { xs: 2, sm: 3 },
              py: { xs: 1, sm: 1.25 },
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            {isMobile ? 'Programare Masa' : 'Programare in Masa'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateSchedule}
            fullWidth={isMobile}
            size={isMobile ? 'medium' : 'large'}
            sx={{
              px: { xs: 2, sm: 3 },
              py: { xs: 1, sm: 1.25 },
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              },
            }}
          >
            {isMobile ? 'Creeaza Program' : 'Creeaza Program Nou'}
          </Button>
        </Stack>

        {/* Selector Luna si Filtre */}
        <Paper sx={{ p: 2, width: '100%' }}>
          <Stack spacing={2}>
            {/* Selector Luna */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CalendarIcon color="action" fontSize="small" />
                <Typography variant="subtitle2" fontWeight="medium">Luna:</Typography>
              </Stack>
              <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
                <Select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setDayFilter('ALL'); // Reset day filter when month changes
                  }}
                >
                  {monthOptions.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Filtre */}
            <Box>
              {/* Header filtre - doar pe desktop/tablet */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: 'none', sm: 'flex' }, mb: 1.5 }}>
                <FilterIcon color="action" fontSize="small" />
                <Typography variant="subtitle2" fontWeight="medium">Filtre:</Typography>
              </Stack>

              {/* Grid responsive pentru filtre */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',           // Mobile: 1 coloana
                  sm: 'repeat(2, 1fr)', // Tablet: 2 coloane
                  md: 'repeat(3, 1fr)', // Desktop mic: 3 coloane
                  lg: 'repeat(6, 1fr)', // Desktop mare: 6 coloane (toate pe un rand)
                },
                gap: { xs: 1, sm: 1.5, md: 2 },
              }}>
                {/* Cautare */}
                <TextField
                  placeholder="Cauta angajat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  fullWidth
                />

                {/* Departament */}
                <FormControl size="small" fullWidth>
                  <InputLabel>Departament</InputLabel>
                  <Select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    label="Departament"
                  >
                    <MenuItem value="ALL">Toate</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Tip Tura */}
                <FormControl size="small" fullWidth>
                  <InputLabel>Tip Tura</InputLabel>
                  <Select
                    value={shiftFilter}
                    onChange={(e) => setShiftFilter(e.target.value as ShiftFilter)}
                    label="Tip Tura"
                  >
                    <MenuItem value="ALL">Toate</MenuItem>
                    <MenuItem value="12H">12 ore</MenuItem>
                    <MenuItem value="8H">8 ore</MenuItem>
                    <MenuItem value="VACATION">Concedii</MenuItem>
                    <MenuItem value="FREE">Liber</MenuItem>
                  </Select>
                </FormControl>

                {/* Loc Munca */}
                <FormControl size="small" fullWidth>
                  <InputLabel>Loc Munca</InputLabel>
                  <Select
                    value={workPositionFilter}
                    onChange={(e) => setWorkPositionFilter(e.target.value)}
                    label="Loc Munca"
                  >
                    <MenuItem value="ALL">Toate</MenuItem>
                    {workPositions.map((pos) => (
                      <MenuItem key={pos.id} value={pos.shortName || pos.name}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {pos.color && (
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: pos.color,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <Typography component="span" sx={{ fontSize: '0.875rem' }}>
                            {pos.name}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Zi */}
                <FormControl size="small" fullWidth>
                  <InputLabel>Zi</InputLabel>
                  <Select
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value)}
                    label="Zi"
                  >
                    <MenuItem value="ALL">Toate zilele</MenuItem>
                    {calendarDays.map(({ day, dayOfWeek, isWeekend }) => (
                      <MenuItem key={day} value={String(day)}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography
                            component="span"
                            sx={{
                              fontWeight: 'bold',
                              color: isWeekend ? 'error.main' : 'text.primary',
                              fontSize: '0.875rem'
                            }}
                          >
                            {day}
                          </Typography>
                          <Typography
                            component="span"
                            sx={{
                              color: isWeekend ? 'error.main' : 'text.secondary',
                              fontSize: '0.75rem'
                            }}
                          >
                            {dayOfWeek}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Buton Reset Filtre - vizibil cand exista filtre active */}
                {(searchQuery || departmentFilter !== 'ALL' || shiftFilter !== 'ALL' || workPositionFilter !== 'ALL' || dayFilter !== 'ALL') && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSearchQuery('');
                      setDepartmentFilter('ALL');
                      setShiftFilter('ALL');
                      setWorkPositionFilter('ALL');
                      setDayFilter('ALL');
                    }}
                    sx={{
                      height: 40,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Reseteaza
                  </Button>
                )}
              </Box>
            </Box>
          </Stack>
        </Paper>

        {/* Legenda - colapsabila pe mobile */}
        <Paper sx={{ p: { xs: 1, sm: 1.5 }, width: '100%' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            onClick={() => isMobile && setLegendExpanded(!legendExpanded)}
            sx={{ cursor: isMobile ? 'pointer' : 'default' }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" fontWeight="bold">
                Legenda:
              </Typography>
              {isMobile && !legendExpanded && (
                <Typography variant="caption" color="text.secondary">
                  (apasa pentru a vedea)
                </Typography>
              )}
            </Stack>
            {isMobile && (
              <IconButton size="small">
                {legendExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            )}
          </Stack>
          <Collapse in={legendExpanded || !isMobile}>
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="wrap"
              useFlexGap
              alignItems="center"
              sx={{ mt: { xs: 1, sm: 0.5 } }}
            >
              <Chip label="Z - Zi 12h (07-19)" size="small" sx={{ bgcolor: '#4CAF50', color: 'white', fontSize: '0.65rem', height: 22 }} />
              <Chip label="N - Noapte 12h (19-07)" size="small" sx={{ bgcolor: '#3F51B5', color: 'white', fontSize: '0.65rem', height: 22 }} />
              <Chip label="Z1 - Zi 8h (06-14)" size="small" sx={{ bgcolor: '#00BCD4', color: 'white', fontSize: '0.65rem', height: 22 }} />
              <Chip label="Z2 - Zi 8h (14-22)" size="small" sx={{ bgcolor: '#9C27B0', color: 'white', fontSize: '0.65rem', height: 22 }} />
              <Chip label="Z3 - Zi 8h (07:30-15:30)" size="small" sx={{ bgcolor: '#795548', color: 'white', fontSize: '0.65rem', height: 22 }} />
              <Chip label="Z4 - Zi 8h (09-17)" size="small" sx={{ bgcolor: '#009688', color: 'white', fontSize: '0.65rem', height: 22 }} />
              <Chip label="Z5 - Zi 8h (08-16)" size="small" sx={{ bgcolor: '#FF5722', color: 'white', fontSize: '0.65rem', height: 22 }} />
              <Chip label="Z6 - Zi 8h (13-21)" size="small" sx={{ bgcolor: '#673AB7', color: 'white', fontSize: '0.65rem', height: 22 }} />
              <Chip label="N8 - Noapte 8h (22-06)" size="small" sx={{ bgcolor: '#E91E63', color: 'white', fontSize: '0.65rem', height: 22 }} />
              <Chip label="CO - Concediu" size="small" sx={{ bgcolor: '#FF9800', color: 'white', fontSize: '0.65rem', height: 22 }} />
              <Chip label="- Liber" variant="outlined" size="small" sx={{ fontSize: '0.65rem', height: 22 }} />
            </Stack>
          </Collapse>
        </Paper>

        {/* Loading/Error states */}
        {isLoading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity="error">
            Eroare la incarcarea programelor.
          </Alert>
        )}

        {/* Tabel cu toti angajatii si programele lor */}
        {!isLoading && !error && (
          <Card sx={{ width: '100%' }}>
            <CardContent sx={{ p: { xs: 1, sm: 2 }, '&:last-child': { pb: { xs: 1, sm: 2 } } }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2} flexWrap="wrap">
                <GroupIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  Programele Angajatilor - {new Date(`${selectedMonth}-01`).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
                </Typography>
                <Chip label={`${filteredUsers.length} angajati`} size="small" color="primary" />
              </Stack>

              {filteredUsers.length > 0 ? (
                <>
                  {/* Mobile/Tablet View - Card-based layout */}
                  {isTablet ? (
                    <Stack spacing={2}>
                      {filteredUsers.map((targetUser, index) => {
                        const userAssignments = allUsersAssignments[targetUser.id]?.assignments || {};
                        const scheduleStatus = getScheduleStatus(targetUser.id);
                        const canEdit = canEditSchedule(targetUser);

                        // Calculate summary for mobile
                        const assignmentsList = Object.entries(userAssignments);
                        const totalShifts = assignmentsList.length;
                        const shiftTypes: Record<string, number> = {};
                        assignmentsList.forEach(([_, assignment]) => {
                          const info = getExistingShiftInfo(assignment.notes);
                          shiftTypes[info.label] = (shiftTypes[info.label] || 0) + 1;
                        });

                        return (
                          <Grow in={true} timeout={400} style={{ transitionDelay: `${index * 50}ms` }} key={targetUser.id}>
                          <Card
                            variant="outlined"
                            sx={{
                              touchAction: 'manipulation',
                              WebkitTapHighlightColor: 'transparent',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                boxShadow: theme.shadows[4],
                                transform: 'translateY(-2px)',
                              },
                              '&:active': {
                                transform: 'scale(0.99)',
                              },
                            }}
                          >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              {/* User Header */}
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Avatar
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      fontSize: '0.875rem',
                                      bgcolor: targetUser.role === 'MANAGER' ? 'primary.main' : 'grey.500'
                                    }}
                                  >
                                    {targetUser.fullName.charAt(0)}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">
                                      {targetUser.fullName}
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                                      <Chip
                                        label={targetUser.role === 'MANAGER' ? 'Manager' : 'User'}
                                        size="small"
                                        color={targetUser.role === 'MANAGER' ? 'primary' : 'default'}
                                        sx={{ height: 18, fontSize: '0.65rem' }}
                                      />
                                      {renderStatusChip(scheduleStatus)}
                                    </Stack>
                                  </Box>
                                </Stack>
                                {canEdit && (
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleEditClick(targetUser)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Stack>

                              {/* Shift Summary */}
                              {totalShifts > 0 ? (
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                    {totalShifts} ture programate:
                                  </Typography>
                                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: !isMobile ? 1 : 0 }}>
                                    {Object.entries(shiftTypes).map(([label, count]) => {
                                      const colorMap: Record<string, string> = {
                                        'Z': '#4CAF50',
                                        'N': '#3F51B5',
                                        'Z1': '#00BCD4',
                                        'Z2': '#9C27B0',
                                        'Z3': '#795548',
                                        'N8': '#E91E63',
                                        'CO': '#FF9800',
                                      };
                                      return (
                                        <Chip
                                          key={label}
                                          label={`${label}: ${count}`}
                                          size="small"
                                          sx={{
                                            bgcolor: colorMap[label] || '#9E9E9E',
                                            color: 'white',
                                            fontSize: '0.7rem',
                                            height: 22,
                                          }}
                                        />
                                      );
                                    })}
                                  </Stack>

                                  {/* Mini calendar pentru tableta/mobil - toate zilele pe landscape, primele 14 pe portrait */}
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                      Calendar {!isLandscape && !isMobile ? '(primele 14 zile)' : '(luna completa)'}:
                                    </Typography>
                                    <Box sx={{
                                      overflowX: 'auto',
                                      pb: 1,
                                      '&::-webkit-scrollbar': { height: 6 },
                                      '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 3 },
                                    }}>
                                      <Stack direction="row" spacing={0.25} sx={{ minWidth: isLandscape || isMobile ? 'max-content' : 'auto' }}>
                                        {(isLandscape || isMobile ? calendarDays : calendarDays.slice(0, 14)).map(({ date, day, isWeekend }) => {
                                          const assignment = userAssignments[date];
                                          const shiftInfo = assignment ? getExistingShiftInfo(assignment.notes) : null;
                                          const workPos = assignment?.workPosition;
                                          return (
                                            <Box
                                              key={date}
                                              sx={{
                                                minWidth: isLandscape ? 32 : 28,
                                                width: isLandscape ? 32 : 28,
                                                height: isLandscape ? 36 : 32,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: 0.5,
                                                bgcolor: shiftInfo ? shiftInfo.color : (isWeekend ? 'grey.200' : 'grey.100'),
                                                color: shiftInfo ? 'white' : 'text.secondary',
                                                fontSize: isLandscape ? '0.6rem' : '0.55rem',
                                                fontWeight: 'bold',
                                                flexShrink: 0,
                                              }}
                                            >
                                              <span style={{ fontSize: isLandscape ? '0.5rem' : '0.45rem', opacity: 0.8 }}>{day}</span>
                                              <span style={{ fontSize: isLandscape ? '0.6rem' : '0.55rem' }}>{shiftInfo?.label || '-'}</span>
                                              {workPos && (
                                                <span style={{ fontSize: isLandscape ? '0.4rem' : '0.35rem', opacity: 0.9 }}>
                                                  {workPos.shortName || workPos.name?.substring(0, 3)}
                                                </span>
                                              )}
                                            </Box>
                                          );
                                        })}
                                      </Stack>
                                    </Box>
                                  </Box>
                                </Box>
                              ) : (
                                <Typography variant="caption" color="text.disabled">
                                  Niciun program setat
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                          </Grow>
                        );
                      })}
                    </Stack>
                  ) : (
                    /* Desktop View - Table layout */
                    <TableContainer sx={{ maxHeight: 500 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{
                                position: 'sticky',
                                left: 0,
                                bgcolor: 'background.paper',
                                zIndex: 3,
                                minWidth: 150,
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                              }}
                            >
                              User
                            </TableCell>
                            {calendarDays.map(({ day, dayOfWeek, isWeekend }) => (
                              <TableCell
                                key={day}
                                align="center"
                                sx={{
                                  p: 0.3,
                                  minWidth: 32,
                                  maxWidth: 38,
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
                            <TableCell
                              align="center"
                              sx={{
                                position: 'sticky',
                                right: 0,
                                bgcolor: 'background.paper',
                                zIndex: 3,
                                minWidth: 60,
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                              }}
                            >
                              Actiuni
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredUsers.map((targetUser) => {
                            const userAssignments = allUsersAssignments[targetUser.id]?.assignments || {};
                            const scheduleStatus = getScheduleStatus(targetUser.id);
                            const canEdit = canEditSchedule(targetUser);

                            return (
                              <TableRow
                                key={targetUser.id}
                                sx={{
                                  '&:hover': { bgcolor: 'action.hover' },
                                }}
                              >
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
                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: targetUser.role === 'MANAGER' ? 'primary.main' : 'grey.500' }}>
                                      {targetUser.fullName.charAt(0)}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.7rem', display: 'block' }}>
                                        {targetUser.fullName}
                                      </Typography>
                                      <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Chip
                                          label={targetUser.role === 'MANAGER' ? 'Manager' : 'User'}
                                          size="small"
                                          color={targetUser.role === 'MANAGER' ? 'primary' : 'default'}
                                          sx={{ height: 14, fontSize: '0.55rem', '& .MuiChip-label': { px: 0.5 } }}
                                        />
                                        {renderStatusChip(scheduleStatus)}
                                      </Stack>
                                    </Box>
                                  </Stack>
                                </TableCell>
                                {calendarDays.map(({ date, isWeekend }) => {
                                  const existingAssignment = userAssignments[date];

                                  let cellContent: React.ReactNode = '-';
                                  let cellBgColor = isWeekend ? 'grey.100' : 'transparent';

                                  if (existingAssignment) {
                                    const shiftInfo = getExistingShiftInfo(existingAssignment.notes);
                                    const workPos = existingAssignment.workPosition;
                                    cellBgColor = shiftInfo.color;
                                    cellContent = (
                                      <Box>
                                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 'bold', lineHeight: 1.2 }}>
                                          {shiftInfo.label}
                                        </Typography>
                                        {workPos && (
                                          <Typography
                                            sx={{
                                              fontSize: '0.45rem',
                                              fontWeight: 'bold',
                                              lineHeight: 1,
                                              opacity: 0.9,
                                              mt: 0.1,
                                            }}
                                          >
                                            {workPos.shortName || workPos.name?.substring(0, 4)}
                                          </Typography>
                                        )}
                                      </Box>
                                    );
                                  }

                                  return (
                                    <TableCell
                                      key={date}
                                      align="center"
                                      sx={{
                                        p: 0.2,
                                        bgcolor: cellBgColor,
                                        color: existingAssignment ? 'white' : 'text.secondary',
                                        fontWeight: 'bold',
                                        fontSize: '0.65rem',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                      }}
                                    >
                                      {cellContent}
                                    </TableCell>
                                  );
                                })}
                                <TableCell
                                  align="center"
                                  sx={{
                                    position: 'sticky',
                                    right: 0,
                                    bgcolor: 'background.paper',
                                    zIndex: 1,
                                    p: 0.5,
                                  }}
                                >
                                  {canEdit && (
                                    <Tooltip title={
                                      isAdmin
                                        ? 'Editeaza programul (Admin)'
                                        : 'Editeaza programul (va necesita aprobare)'
                                    }>
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => handleEditClick(targetUser)}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={<EventBusyIcon />}
                  title="Nu s-au gasit angajati"
                  description="Incearca sa schimbi filtrele sau sa resetezi cautarea"
                  actionLabel={hasActiveFilters ? 'Reseteaza Filtrele' : undefined}
                  onAction={hasActiveFilters ? handleResetFilters : undefined}
                />
              )}
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Dialog confirmare editare */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Editare Program - {selectedUser?.fullName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {isAdmin ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Ca <strong>Administrator</strong>, poti edita direct programul. Modificarile vor fi aplicate imediat.
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Ca <strong>Manager</strong>, poti edita programul angajatilor, dar modificarile vor trebui <strong>aprobate de un administrator</strong> inainte de a fi active.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary">
              Vei fi redirectionat catre pagina de creare/editare program pentru <strong>{selectedUser?.fullName}</strong> pentru luna {new Date(`${selectedMonth}-01`).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Anuleaza
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmEdit}
            startIcon={<EditIcon />}
          >
            Continua la Editare
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SchedulesPage;
