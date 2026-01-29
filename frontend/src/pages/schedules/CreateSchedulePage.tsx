import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CalendarMonth as CalendarIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCreateScheduleMutation } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import type { ScheduleAssignmentDto } from '../../types/schedule.types';

// Tipuri de ture
type ShiftPatternType = '12H' | '8H';

interface ShiftOption {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  color: string;
  isNightShift: boolean;
  isVacation: boolean;
}

// Opțiuni pentru tura de 12 ore
const SHIFT_OPTIONS_12H: ShiftOption[] = [
  { id: 'day_12', label: 'Zi 07-19', startTime: '07:00', endTime: '19:00', color: '#4CAF50', isNightShift: false, isVacation: false },
  { id: 'night_12', label: 'Noapte 19-07', startTime: '19:00', endTime: '07:00', color: '#3F51B5', isNightShift: true, isVacation: false },
  { id: 'vacation_12', label: 'Concediu', startTime: '', endTime: '', color: '#FF9800', isNightShift: false, isVacation: true },
];

// Opțiuni pentru tura de 8 ore
const SHIFT_OPTIONS_8H: ShiftOption[] = [
  { id: 'day1_8', label: 'Zi 06-14', startTime: '06:00', endTime: '14:00', color: '#4CAF50', isNightShift: false, isVacation: false },
  { id: 'day2_8', label: 'Zi 14-22', startTime: '14:00', endTime: '22:00', color: '#8BC34A', isNightShift: false, isVacation: false },
  { id: 'night_8', label: 'Noapte 22-06', startTime: '22:00', endTime: '06:00', color: '#3F51B5', isNightShift: true, isVacation: false },
  { id: 'vacation_8', label: 'Concediu', startTime: '', endTime: '', color: '#FF9800', isNightShift: false, isVacation: true },
];

const CreateSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [shiftPattern, setShiftPattern] = useState<ShiftPatternType>('12H');
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`;
  });
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // API hooks
  const { data: users = [], isLoading: usersLoading } = useGetUsersQuery({ isActive: true });
  const [createSchedule, { isLoading: creating, error }] = useCreateScheduleMutation();

  // Filtrăm doar angajații și managerii (nu adminii)
  const eligibleUsers = useMemo(() => {
    return users.filter(u => u.role === 'ANGAJAT' || u.role === 'MANAGER');
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

  // Handler pentru schimbarea turei unei zile
  const handleDayShiftChange = (date: string, shiftId: string) => {
    setAssignments(prev => {
      if (shiftId === '') {
        const { [date]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [date]: shiftId };
    });
  };

  // Curăță toate asignările
  const handleClearAll = () => {
    setAssignments({});
  };

  // Salvează programul
  const handleSave = async () => {
    if (!selectedUserId) {
      return;
    }

    try {
      // Convertim assignments în format API
      const assignmentDtos: ScheduleAssignmentDto[] = Object.entries(assignments)
        .map(([date, shiftId]) => {
          const shiftOption = shiftOptions.find(s => s.id === shiftId);
          if (!shiftOption || shiftOption.isVacation) {
            // Pentru concediu, folosim un shiftTypeId special sau null
            return {
              userId: selectedUserId,
              shiftTypeId: 'vacation', // Backend-ul trebuie să gestioneze acest caz
              shiftDate: date,
              notes: 'Concediu',
            };
          }
          return {
            userId: selectedUserId,
            shiftTypeId: shiftId,
            shiftDate: date,
            notes: `${shiftOption.startTime}-${shiftOption.endTime}`,
          };
        });

      await createSchedule({
        monthYear,
        assignments: assignmentDtos,
        notes: `Program pentru ${eligibleUsers.find(u => u.id === selectedUserId)?.fullName || 'utilizator'} - Tura ${shiftPattern}`,
      }).unwrap();

      navigate('/schedules');
    } catch (err) {
      console.error('Failed to create schedule:', err);
    }
  };

  // Obține culoarea pentru o zi
  const getDayColor = (date: string) => {
    const shiftId = assignments[date];
    if (!shiftId) return 'transparent';
    const shift = shiftOptions.find(s => s.id === shiftId);
    return shift?.color || 'transparent';
  };

  // Obține label-ul pentru o zi
  const getDayLabel = (date: string) => {
    const shiftId = assignments[date];
    if (!shiftId) return '';
    const shift = shiftOptions.find(s => s.id === shiftId);
    return shift?.label || '';
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/schedules')}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
          >
            Înapoi
          </Button>
          <Box sx={{ flex: 1 }}>
            <Typography variant={isMobile ? 'h5' : 'h4'}>Creare Program de Lucru</Typography>
            <Typography variant="body2" color="text.secondary">
              Creează programul lunar pentru un angajat sau manager
            </Typography>
          </Box>
        </Stack>

        {/* Error Alert */}
        {error && (
          <Alert severity="error">
            Eroare la crearea programului. Încercați din nou.
          </Alert>
        )}

        {/* Selectori - Angajat, Tip Tură, Lună */}
        <Card sx={{ width: '100%' }}>
          <CardContent>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              alignItems: { xs: 'stretch', sm: 'center' },
            }}>
              {/* Selector Angajat */}
              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon fontSize="small" />
                      Angajat / Manager
                    </Box>
                  </InputLabel>
                  <Select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    label="Angajat / Manager"
                    disabled={usersLoading}
                  >
                    {eligibleUsers.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={user.role === 'MANAGER' ? 'M' : 'A'}
                            size="small"
                            color={user.role === 'MANAGER' ? 'primary' : 'default'}
                            sx={{ minWidth: 28 }}
                          />
                          {user.fullName}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Selector Tip Tură */}
              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ScheduleIcon fontSize="small" />
                      Tip Tură
                    </Box>
                  </InputLabel>
                  <Select
                    value={shiftPattern}
                    onChange={(e) => {
                      setShiftPattern(e.target.value as ShiftPatternType);
                      setAssignments({}); // Reset assignments când schimbăm tipul de tură
                    }}
                    label="Tip Tură"
                  >
                    <MenuItem value="12H">Tură de 12 ore</MenuItem>
                    <MenuItem value="8H">Tură de 8 ore</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Selector Lună */}
              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarIcon fontSize="small" />
                      Luna
                    </Box>
                  </InputLabel>
                  <Select
                    value={monthYear}
                    onChange={(e) => {
                      setMonthYear(e.target.value);
                      setAssignments({});
                    }}
                    label="Luna"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() + i);
                      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      const label = date.toLocaleDateString('ro-RO', {
                        year: 'numeric',
                        month: 'long',
                      });
                      return (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Legendă Ture */}
        <Paper sx={{ p: 2, width: '100%' }}>
          <Typography variant="subtitle2" gutterBottom>
            Legendă - Opțiuni {shiftPattern === '12H' ? 'Tură 12 ore' : 'Tură 8 ore'}:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {shiftOptions.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                sx={{
                  bgcolor: option.color,
                  color: 'white',
                  fontWeight: 'bold',
                  mb: 1,
                }}
              />
            ))}
            <Chip
              label="Liber"
              variant="outlined"
              sx={{ mb: 1 }}
            />
          </Stack>
        </Paper>

        {/* Tabel Calendar */}
        {selectedUserId ? (
          <Card sx={{ width: '100%', overflow: 'auto' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Program {new Date(`${monthYear}-01`).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
                </Typography>
                <Tooltip title="Șterge toate selecțiile">
                  <IconButton onClick={handleClearAll} color="error" size="small">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Calendar Grid */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(4, 1fr)',
                  sm: 'repeat(5, 1fr)',
                  md: 'repeat(7, 1fr)',
                },
                gap: 1,
              }}>
                {calendarDays.map(({ day, date, dayOfWeek, isWeekend }) => (
                  <Paper
                    key={date}
                    elevation={2}
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      bgcolor: isWeekend ? 'grey.100' : 'background.paper',
                      border: assignments[date] ? `2px solid ${getDayColor(date)}` : '1px solid',
                      borderColor: assignments[date] ? getDayColor(date) : 'divider',
                      borderRadius: 1,
                      minHeight: { xs: 100, sm: 120 },
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Header zi */}
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1,
                      pb: 0.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 'bold',
                          color: isWeekend ? 'error.main' : 'text.secondary',
                        }}
                      >
                        {dayOfWeek}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: isWeekend ? 'error.light' : 'primary.light',
                          color: 'white',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
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
                          fontSize: '0.7rem',
                          '& .MuiSelect-select': {
                            py: 0.5,
                            bgcolor: getDayColor(date),
                            color: assignments[date] ? 'white' : 'inherit',
                            fontWeight: assignments[date] ? 'bold' : 'normal',
                          },
                        }}
                      >
                        <MenuItem value="">
                          <em>Liber</em>
                        </MenuItem>
                        {shiftOptions.map((option) => (
                          <MenuItem
                            key={option.id}
                            value={option.id}
                            sx={{
                              bgcolor: option.color,
                              color: 'white',
                              '&:hover': {
                                bgcolor: option.color,
                                opacity: 0.9,
                              },
                              '&.Mui-selected': {
                                bgcolor: option.color,
                                '&:hover': {
                                  bgcolor: option.color,
                                },
                              },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Label tura selectată */}
                    {assignments[date] && (
                      <Typography
                        variant="caption"
                        sx={{
                          mt: 0.5,
                          color: getDayColor(date),
                          fontWeight: 'bold',
                          fontSize: '0.65rem',
                        }}
                      >
                        {getDayLabel(date)}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info">
            Selectează un angajat sau manager pentru a crea programul de lucru.
          </Alert>
        )}

        {/* Sumar și butoane */}
        {selectedUserId && (
          <Card sx={{ width: '100%' }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Sumar program:
                  </Typography>
                  <Typography variant="body2">
                    <strong>{Object.keys(assignments).length}</strong> zile asignate din <strong>{daysInMonth}</strong> zile
                  </Typography>
                  <Typography variant="body2">
                    Angajat: <strong>{eligibleUsers.find(u => u.id === selectedUserId)?.fullName}</strong>
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/schedules')}
                  >
                    Anulează
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={creating ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={handleSave}
                    disabled={creating || Object.keys(assignments).length === 0}
                  >
                    {creating ? 'Se salvează...' : 'Salvează Programul'}
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

export default CreateSchedulePage;
