import React, { useState, useMemo, useEffect } from 'react';
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
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
  Group as GroupIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCreateScheduleMutation, useGetSchedulesQuery, useGetShiftTypesQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
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
  { id: 'night_8', label: 'Noapte 22-06', shortLabel: 'N8', startTime: '22:00', endTime: '06:00', color: '#E91E63', isNightShift: true, isVacation: false },
  { id: 'vacation_8', label: 'Concediu', shortLabel: 'CO', startTime: '', endTime: '', color: '#FF9800', isNightShift: false, isVacation: true },
];

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

const CreateSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user: currentUser } = useAppSelector((state) => state.auth);

  // Verifică rolul utilizatorului
  const isAdmin = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'MANAGER';

  // Obține parametrii din URL
  const urlUserId = searchParams.get('userId');
  const urlMonth = searchParams.get('month');

  // State
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [shiftPattern, setShiftPattern] = useState<ShiftPatternType>('12H');
  const [monthYear, setMonthYear] = useState(() => {
    if (urlMonth) return urlMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lista de luni (generată o singură dată)
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // API hooks
  const { data: users = [], isLoading: usersLoading } = useGetUsersQuery({ isActive: true });
  const { data: existingSchedules = [] } = useGetSchedulesQuery({ monthYear });
  const { data: dbShiftTypes = [] } = useGetShiftTypesQuery();
  const [createSchedule, { isLoading: creating, error }] = useCreateScheduleMutation();

  // Mapează shift types din DB la opțiunile locale
  const getShiftTypeId = (localId: string): string | null => {
    // Log pentru debugging
    console.log('Looking for shift type:', localId);
    console.log('Available DB shift types:', dbShiftTypes);

    // Mapare bazată pe numele din DB
    const nameMapping: Record<string, string> = {
      'day_12': 'Zi 07-19',
      'night_12': 'Noapte 19-07',
      'vacation_12': 'Concediu 12H',
      'day1_8': 'Zi 06-14',
      'day2_8': 'Zi 14-22',
      'day3_8': 'Zi 07:30-15:30',
      'night_8': 'Noapte 22-06',
      'vacation_8': 'Concediu 8H',
    };

    const expectedName = nameMapping[localId];
    if (!expectedName) {
      console.warn(`No name mapping for localId: ${localId}`);
      return null;
    }

    // Găsește shift type în DB după nume exact
    const dbShift = dbShiftTypes.find(st => st.name === expectedName);

    if (dbShift) {
      console.log(`Found match for ${localId}:`, dbShift);
      return dbShift.id;
    }

    // Fallback - caută după pattern în nume
    const isVacation = localId.includes('vacation');
    const pattern = localId.includes('_12') ? 'SHIFT_12H' : 'SHIFT_8H';

    const fallbackShift = dbShiftTypes.find(st => {
      if (isVacation) {
        return (st.name.toLowerCase().includes('concediu') || st.name.toLowerCase().includes('vacation')) &&
               st.shiftPattern === pattern;
      }
      return st.shiftPattern === pattern && st.name.includes(expectedName.split(' ')[1] || '');
    });

    if (fallbackShift) {
      console.log(`Found fallback match for ${localId}:`, fallbackShift);
      return fallbackShift.id;
    }

    console.warn(`No matching shift type found for ${localId}`);
    return null;
  };

  // Setează utilizatorul din URL dacă există
  useEffect(() => {
    if (urlUserId && users.length > 0) {
      const userExists = users.find(u => u.id === urlUserId);
      if (userExists) {
        setSelectedUserId(urlUserId);
      }
    }
  }, [urlUserId, users]);

  // Filtrăm doar angajații și managerii (nu adminii)
  const eligibleUsers = useMemo(() => {
    return users.filter(u => u.role === 'USER' || u.role === 'MANAGER');
  }, [users]);

  // Obține opțiunile de tură în funcție de tipul selectat
  const shiftOptions = shiftPattern === '12H' ? SHIFT_OPTIONS_12H : SHIFT_OPTIONS_8H;

  // Generează zilele lunii
  const daysInMonth = useMemo(() => {
    const [year, month] = monthYear.split('-').map(Number);
    const date = new Date(year, month, 0);
    return date.getDate();
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

  // Creează un map cu toate asignările existente pentru toți angajații
  const allUsersAssignments = useMemo(() => {
    const userAssignmentsMap: Record<string, Record<string, { shiftId: string; notes: string }>> = {};

    existingSchedules.forEach(schedule => {
      if (schedule.assignments) {
        schedule.assignments.forEach(assignment => {
          if (!userAssignmentsMap[assignment.userId]) {
            userAssignmentsMap[assignment.userId] = {};
          }
          userAssignmentsMap[assignment.userId][assignment.shiftDate] = {
            shiftId: assignment.shiftTypeId,
            notes: assignment.notes || '',
          };
        });
      }
    });

    return userAssignmentsMap;
  }, [existingSchedules]);

  // Handler pentru schimbarea turei unei zile
  const handleDayShiftChange = (date: string, shiftId: string) => {
    console.log('=== SHIFT CHANGE ===', { date, shiftId });
    setAssignments(prev => {
      const newAssignments = shiftId === ''
        ? (({ [date]: _, ...rest }) => rest)(prev)
        : { ...prev, [date]: shiftId };
      console.log('New assignments state:', newAssignments);
      console.log('Total assignments:', Object.keys(newAssignments).length);
      return newAssignments;
    });
  };

  // Curăță toate asignările
  const handleClearAll = () => {
    setAssignments({});
  };

  // Creează lista de asignări
  const createAssignmentDtos = (): ScheduleAssignmentDto[] => {
    const validAssignments: ScheduleAssignmentDto[] = [];

    Object.entries(assignments).forEach(([date, localShiftId]) => {
      const shiftOption = shiftOptions.find(s => s.id === localShiftId);
      const dbShiftTypeId = getShiftTypeId(localShiftId);

      if (!dbShiftTypeId) {
        console.warn(`No matching shift type found for ${localShiftId}`);
        return;
      }

      validAssignments.push({
        userId: selectedUserId,
        shiftTypeId: dbShiftTypeId,
        shiftDate: date,
        notes: shiftOption?.isVacation ? 'Concediu' : `${shiftOption?.startTime}-${shiftOption?.endTime}`,
      });
    });

    return validAssignments;
  };

  // Salvează programul (pentru Admin - salvează direct)
  const handleSave = async () => {
    if (!selectedUserId) return;

    try {
      const assignmentDtos = createAssignmentDtos();
      const selectedUser = eligibleUsers.find(u => u.id === selectedUserId);

      // Debug logging
      console.log('=== SAVE DEBUG ===');
      console.log('Selected User ID:', selectedUserId);
      console.log('Month Year:', monthYear);
      console.log('Assignments from state:', assignments);
      console.log('Assignment DTOs to send:', assignmentDtos);
      console.log('Number of assignments:', assignmentDtos.length);

      const requestBody = {
        monthYear,
        assignments: assignmentDtos,
        notes: `Program pentru ${selectedUser?.fullName || 'utilizator'} - Tura ${shiftPattern}`,
        // Pentru Admin, programul este aprobat direct
        status: (isAdmin ? 'APPROVED' : 'DRAFT') as ScheduleStatus,
      };
      console.log('Full request body:', JSON.stringify(requestBody, null, 2));

      await createSchedule(requestBody).unwrap();

      setSuccessMessage(isAdmin
        ? 'Programul a fost salvat și aprobat cu succes!'
        : 'Programul a fost salvat ca draft.');

      setTimeout(() => navigate('/schedules'), 1500);
    } catch (err) {
      console.error('Failed to create schedule:', err);
    }
  };

  // Salvează și trimite pentru aprobare (pentru Manager)
  const handleSaveAndSubmit = async () => {
    if (!selectedUserId) return;

    try {
      const assignmentDtos = createAssignmentDtos();
      const selectedUser = eligibleUsers.find(u => u.id === selectedUserId);

      await createSchedule({
        monthYear,
        assignments: assignmentDtos,
        notes: `Program pentru ${selectedUser?.fullName || 'utilizator'} - Tura ${shiftPattern}`,
        status: 'PENDING_APPROVAL' as ScheduleStatus,
      }).unwrap();

      setSuccessMessage('Programul a fost trimis pentru aprobare. Un administrator îl va revizui.');
      setTimeout(() => navigate('/schedules'), 2000);
    } catch (err) {
      console.error('Failed to submit schedule:', err);
    }
  };

  // Obține culoarea pentru o zi
  const getDayColor = (date: string) => {
    const shiftId = assignments[date];
    if (!shiftId) return 'transparent';
    const shift = shiftOptions.find(s => s.id === shiftId);
    return shift?.color || 'transparent';
  };

  // Obține info pentru o asignare existentă
  const getExistingShiftInfo = (notes: string) => {
    if (notes === 'Concediu') {
      return { label: 'CO', color: '#FF9800' };
    }
    if (notes.includes('07:00-19:00')) {
      return { label: 'Z', color: '#4CAF50' };
    }
    if (notes.includes('19:00-07:00')) {
      return { label: 'N', color: '#3F51B5' };
    }
    if (notes.includes('06:00-14:00')) {
      return { label: 'Z1', color: '#4CAF50' };
    }
    if (notes.includes('14:00-22:00')) {
      return { label: 'Z2', color: '#8BC34A' };
    }
    if (notes.includes('22:00-06:00')) {
      return { label: 'N', color: '#3F51B5' };
    }
    return { label: '-', color: '#9E9E9E' };
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
            <Typography variant={isMobile ? 'h6' : 'h5'}>Creare Program de Lucru</Typography>
            <Typography variant="caption" color="text.secondary">
              Creează programul lunar pentru un user sau manager
            </Typography>
          </Box>
        </Stack>

        {/* Success Alert */}
        {successMessage && (
          <Alert severity="success" sx={{ width: '100%' }}>
            {successMessage}
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ width: '100%' }}>
            Eroare la crearea programului. Încercați din nou.
          </Alert>
        )}

        {/* Info despre permisiuni */}
        {isManager && !isAdmin && (
          <Alert severity="info" sx={{ width: '100%' }}>
            Ca <strong>Manager</strong>, poți crea programe pentru angajați. Acestea vor trebui <strong>aprobate de un administrator</strong> înainte de a fi active.
          </Alert>
        )}
        {isAdmin && (
          <Alert severity="success" sx={{ width: '100%' }}>
            Ca <strong>Administrator</strong>, programele create vor fi <strong>aprobate automat</strong>.
          </Alert>
        )}

        {/* Selectori - User, Tip Tură, Lună */}
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: { xs: 'stretch', md: 'center' },
            }}>
              {/* Selector User */}
              <Box sx={{ flex: 1, minWidth: { md: 200 } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>User / Manager</InputLabel>
                  <Select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    label="User / Manager"
                    disabled={usersLoading}
                  >
                    {eligibleUsers.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={user.role === 'MANAGER' ? 'M' : 'A'}
                            size="small"
                            color={user.role === 'MANAGER' ? 'primary' : 'default'}
                            sx={{ minWidth: 24, height: 20, fontSize: '0.7rem' }}
                          />
                          <Typography variant="body2">{user.fullName}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Selector Tip Tură */}
              <Box sx={{ flex: 1, minWidth: { md: 150 } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tip Tură</InputLabel>
                  <Select
                    value={shiftPattern}
                    onChange={(e) => {
                      setShiftPattern(e.target.value as ShiftPatternType);
                      setAssignments({});
                    }}
                    label="Tip Tură"
                  >
                    <MenuItem value="12H">Tură 12 ore</MenuItem>
                    <MenuItem value="8H">Tură 8 ore</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Selector Lună */}
              <Box sx={{ flex: 1, minWidth: { md: 180 } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Luna</InputLabel>
                  <Select
                    value={monthYear}
                    onChange={(e) => {
                      setMonthYear(e.target.value);
                      setAssignments({});
                    }}
                    label="Luna"
                  >
                    {monthOptions.map(({ value, label }) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Legendă Ture */}
        <Paper sx={{ p: 1.5, width: '100%' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
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
          {shiftPattern === '12H' && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              * După tura de zi (Z) - 24h liber | După tura de noapte (N) - 48h liber
            </Typography>
          )}
        </Paper>

        {/* Tabel Calendar */}
        {selectedUserId ? (
          <Card sx={{ width: '100%', overflow: 'auto' }}>
            <CardContent sx={{ p: { xs: 1, sm: 2 }, '&:last-child': { pb: { xs: 1, sm: 2 } } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Program {new Date(`${monthYear}-01`).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
                </Typography>
                <Tooltip title="Șterge toate selecțiile">
                  <IconButton onClick={handleClearAll} color="error" size="small">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Calendar Grid */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(7, 1fr)',
                  sm: 'repeat(7, 1fr)',
                },
                gap: 0.5,
              }}>
                {calendarDays.map(({ day, date, dayOfWeek, isWeekend }) => (
                  <Paper
                    key={date}
                    elevation={1}
                    sx={{
                      p: 0.5,
                      textAlign: 'center',
                      bgcolor: isWeekend ? 'grey.100' : 'background.paper',
                      border: assignments[date] ? `2px solid ${getDayColor(date)}` : '1px solid',
                      borderColor: assignments[date] ? getDayColor(date) : 'divider',
                      borderRadius: 1,
                      minHeight: { xs: 70, sm: 85 },
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Header zi */}
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 0.5,
                    }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '0.6rem',
                          color: isWeekend ? 'error.main' : 'text.secondary',
                        }}
                      >
                        {dayOfWeek}
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: isWeekend ? 'error.light' : 'primary.light',
                          color: 'white',
                          borderRadius: '50%',
                          width: 18,
                          height: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                        }}
                      >
                        {day}
                      </Typography>
                    </Box>

                    {/* Selector tură */}
                    <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                      <Select
                        value={assignments[date] || ''}
                        onChange={(e) => handleDayShiftChange(date, e.target.value)}
                        displayEmpty
                        sx={{
                          fontSize: '0.65rem',
                          '& .MuiSelect-select': {
                            py: 0.3,
                            px: 0.5,
                            bgcolor: getDayColor(date),
                            color: assignments[date] ? 'white' : 'inherit',
                            fontWeight: assignments[date] ? 'bold' : 'normal',
                            minHeight: 'unset !important',
                          },
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderWidth: 1,
                          },
                        }}
                      >
                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}>
                          <em>Liber</em>
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
                              '&.Mui-selected': { bgcolor: option.color, '&:hover': { bgcolor: option.color } },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Paper>
                ))}
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info" sx={{ width: '100%' }}>
            Selectează un user sau manager pentru a crea programul de lucru.
          </Alert>
        )}

        {/* Sumar și butoane */}
        {selectedUserId && (
          <Card sx={{ width: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
                <Box>
                  <Typography variant="body2">
                    <strong>{Object.keys(assignments).length}</strong> zile asignate din <strong>{daysInMonth}</strong> |
                    User: <strong>{eligibleUsers.find(u => u.id === selectedUserId)?.fullName}</strong>
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button variant="outlined" size="small" onClick={() => navigate('/schedules')}>
                    Anulează
                  </Button>
                  {isAdmin ? (
                    // Admin - salvează și aprobă direct
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      startIcon={creating ? <CircularProgress size={16} /> : <SaveIcon />}
                      onClick={handleSave}
                      disabled={creating || Object.keys(assignments).length === 0}
                    >
                      {creating ? 'Salvare...' : 'Salvează și Aprobă'}
                    </Button>
                  ) : (
                    // Manager - salvează ca draft sau trimite pentru aprobare
                    <>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={creating ? <CircularProgress size={16} /> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={creating || Object.keys(assignments).length === 0}
                      >
                        Salvează Draft
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        startIcon={creating ? <CircularProgress size={16} /> : <SendIcon />}
                        onClick={handleSaveAndSubmit}
                        disabled={creating || Object.keys(assignments).length === 0}
                      >
                        Trimite pentru Aprobare
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Secțiunea cu toți angajații și programele lor */}
        <Divider sx={{ my: 1 }} />

        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: { xs: 1, sm: 2 }, '&:last-child': { pb: { xs: 1, sm: 2 } } }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <GroupIcon color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">
                Programele Tuturor Angajaților - {new Date(`${monthYear}-01`).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
              </Typography>
            </Stack>

            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        bgcolor: 'background.paper',
                        zIndex: 3,
                        minWidth: 120,
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
                          minWidth: 30,
                          maxWidth: 35,
                          bgcolor: isWeekend ? 'grey.200' : 'background.paper',
                          fontWeight: 'bold',
                          fontSize: '0.65rem',
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: '0.6rem', color: isWeekend ? 'error.main' : 'text.secondary' }}>
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
                  {eligibleUsers.map((user) => {
                    const userAssignments = allUsersAssignments[user.id] || {};
                    const isCurrentUser = user.id === selectedUserId;

                    return (
                      <TableRow
                        key={user.id}
                        sx={{
                          bgcolor: isCurrentUser ? 'primary.light' : 'inherit',
                          '&:hover': { bgcolor: isCurrentUser ? 'primary.light' : 'action.hover' },
                        }}
                      >
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            bgcolor: isCurrentUser ? 'primary.light' : 'background.paper',
                            zIndex: 1,
                            p: 0.5,
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                              {user.fullName.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="caption" fontWeight={isCurrentUser ? 'bold' : 'normal'} sx={{ fontSize: '0.7rem' }}>
                                {user.fullName}
                              </Typography>
                              <Chip
                                label={user.role === 'MANAGER' ? 'M' : 'A'}
                                size="small"
                                color={user.role === 'MANAGER' ? 'primary' : 'default'}
                                sx={{ ml: 0.5, height: 14, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.5 } }}
                              />
                            </Box>
                          </Stack>
                        </TableCell>
                        {calendarDays.map(({ date, isWeekend }) => {
                          // Pentru utilizatorul curent, arată asignările din state
                          // Pentru alți utilizatori, arată asignările din baza de date
                          const currentUserShift = isCurrentUser ? assignments[date] : null;
                          const existingAssignment = userAssignments[date];

                          let cellContent = null;
                          let cellBgColor = isWeekend ? 'grey.100' : 'transparent';

                          if (isCurrentUser && currentUserShift) {
                            const shift = shiftOptions.find(s => s.id === currentUserShift);
                            if (shift) {
                              cellContent = shift.shortLabel;
                              cellBgColor = shift.color;
                            }
                          } else if (existingAssignment) {
                            const shiftInfo = getExistingShiftInfo(existingAssignment.notes);
                            cellContent = shiftInfo.label;
                            cellBgColor = shiftInfo.color;
                          }

                          return (
                            <TableCell
                              key={date}
                              align="center"
                              sx={{
                                p: 0.2,
                                bgcolor: cellBgColor,
                                color: cellContent ? 'white' : 'inherit',
                                fontWeight: 'bold',
                                fontSize: '0.65rem',
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              {cellContent || '-'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {eligibleUsers.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Nu există angajați sau manageri activi.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default CreateSchedulePage;
