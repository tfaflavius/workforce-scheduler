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
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  FilterList as FilterIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useNavigate } from 'react-router-dom';

// Generează lista de luni (6 luni înapoi + luna curentă + 5 luni înainte)
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();

  for (let i = -6; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

const SchedulesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filtering state
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lista de luni (generată o singură dată)
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const { data: schedules = [], isLoading, error } = useGetSchedulesQuery({
    monthYear: selectedMonth,
  });
  const { data: users = [] } = useGetUsersQuery({ isActive: true });

  // Filtrăm doar angajații și managerii
  const eligibleUsers = useMemo(() => {
    return users.filter(u => u.role === 'ANGAJAT' || u.role === 'MANAGER');
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

  // Creează un map cu toate asignările existente pentru toți angajații
  const allUsersAssignments = useMemo(() => {
    const userAssignmentsMap: Record<string, Record<string, { shiftId: string; notes: string }>> = {};

    schedules.forEach(schedule => {
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
    if (notes.includes('06:00-14:00')) {
      return { label: 'Z1', color: '#4CAF50', type: '8H' as const };
    }
    if (notes.includes('14:00-22:00')) {
      return { label: 'Z2', color: '#8BC34A', type: '8H' as const };
    }
    if (notes.includes('22:00-06:00')) {
      return { label: 'N', color: '#3F51B5', type: '8H' as const };
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

    // Filtru după tipul de tură
    if (shiftFilter !== 'ALL') {
      filtered = filtered.filter(user => {
        const userAssignments = allUsersAssignments[user.id] || {};
        const assignmentValues = Object.values(userAssignments);

        if (shiftFilter === 'FREE') {
          // Arată utilizatorii care nu au nici o asignare în această lună
          return assignmentValues.length === 0;
        }

        // Verifică dacă utilizatorul are cel puțin o asignare de tipul selectat
        return assignmentValues.some(assignment => {
          const shiftInfo = getExistingShiftInfo(assignment.notes);
          return shiftInfo.type === shiftFilter;
        });
      });
    }

    return filtered;
  }, [eligibleUsers, searchQuery, shiftFilter, allUsersAssignments]);

  const handleCreateSchedule = () => {
    navigate('/schedules/create');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={2}>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2
        }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              Programe de Lucru
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestionează programele lunare de lucru
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateSchedule}
            fullWidth={isMobile}
            size={isMobile ? 'small' : 'medium'}
          >
            Creează Program
          </Button>
        </Box>

        {/* Selector Lună și Filtre */}
        <Paper sx={{ p: 2, width: '100%' }}>
          <Stack spacing={2}>
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
                <InputLabel>Tip Tură</InputLabel>
                <Select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value as ShiftFilter)}
                  label="Tip Tură"
                >
                  <MenuItem value="ALL">Toate</MenuItem>
                  <MenuItem value="12H">Ture 12 ore</MenuItem>
                  <MenuItem value="8H">Ture 8 ore</MenuItem>
                  <MenuItem value="VACATION">Concedii</MenuItem>
                  <MenuItem value="FREE">Liber</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Paper>

        {/* Legendă */}
        <Paper sx={{ p: 1.5, width: '100%' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
              Legendă:
            </Typography>
            <Chip label="Z - Zi 12h (07-19)" size="small" sx={{ bgcolor: '#4CAF50', color: 'white', fontSize: '0.7rem', height: 24 }} />
            <Chip label="N - Noapte 12h (19-07)" size="small" sx={{ bgcolor: '#3F51B5', color: 'white', fontSize: '0.7rem', height: 24 }} />
            <Chip label="Z1 - Zi 8h (06-14)" size="small" sx={{ bgcolor: '#4CAF50', color: 'white', fontSize: '0.7rem', height: 24 }} />
            <Chip label="Z2 - Zi 8h (14-22)" size="small" sx={{ bgcolor: '#8BC34A', color: 'white', fontSize: '0.7rem', height: 24 }} />
            <Chip label="N - Noapte 8h (22-06)" size="small" sx={{ bgcolor: '#3F51B5', color: 'white', fontSize: '0.7rem', height: 24 }} />
            <Chip label="CO - Concediu" size="small" sx={{ bgcolor: '#FF9800', color: 'white', fontSize: '0.7rem', height: 24 }} />
            <Chip label="- Liber" variant="outlined" size="small" sx={{ fontSize: '0.7rem', height: 24 }} />
          </Stack>
        </Paper>

        {/* Loading/Error states */}
        {isLoading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity="error">
            Eroare la încărcarea programelor.
          </Alert>
        )}

        {/* Tabel cu toți angajații și programele lor */}
        {!isLoading && !error && (
          <Card sx={{ width: '100%' }}>
            <CardContent sx={{ p: { xs: 1, sm: 2 }, '&:last-child': { pb: { xs: 1, sm: 2 } } }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <GroupIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Programele Angajaților - {new Date(`${selectedMonth}-01`).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
                </Typography>
                <Chip label={`${filteredUsers.length} angajați`} size="small" color="primary" />
              </Stack>

              {filteredUsers.length > 0 ? (
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
                            minWidth: 130,
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
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const userAssignments = allUsersAssignments[user.id] || {};

                        return (
                          <TableRow
                            key={user.id}
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
                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: user.role === 'MANAGER' ? 'primary.main' : 'grey.500' }}>
                                  {user.fullName.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.7rem', display: 'block' }}>
                                    {user.fullName}
                                  </Typography>
                                  <Chip
                                    label={user.role === 'MANAGER' ? 'Manager' : 'Angajat'}
                                    size="small"
                                    color={user.role === 'MANAGER' ? 'primary' : 'default'}
                                    sx={{ height: 14, fontSize: '0.55rem', '& .MuiChip-label': { px: 0.5 } }}
                                  />
                                </Box>
                              </Stack>
                            </TableCell>
                            {calendarDays.map(({ date, isWeekend }) => {
                              const existingAssignment = userAssignments[date];

                              let cellContent = '-';
                              let cellBgColor = isWeekend ? 'grey.100' : 'transparent';

                              if (existingAssignment) {
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
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  Nu s-au găsit angajați cu filtrele selectate.
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
};

export default SchedulesPage;
