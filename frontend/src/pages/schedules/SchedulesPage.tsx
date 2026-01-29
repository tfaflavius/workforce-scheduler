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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useGetSchedulesQuery, useGetShiftTypesQuery } from '../../store/api/schedulesApi';
import { ScheduleStatus, type ScheduleCalendarEvent, type WorkSchedule } from '../../types/schedule.types';
import { useNavigate } from 'react-router-dom';

const SchedulesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Filtering and sorting state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: schedules, isLoading, error } = useGetSchedulesQuery({
    monthYear: selectedMonth,
  });
  const { data: shiftTypes } = useGetShiftTypesQuery();

  // Filtered and sorted schedules
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];

    let filtered = [...schedules];

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((schedule) => schedule.status === statusFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (schedule) =>
          schedule.name?.toLowerCase().includes(query) ||
          schedule.department?.name?.toLowerCase().includes(query) ||
          schedule.creator?.fullName?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
        default:
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [schedules, statusFilter, searchQuery, sortBy, sortOrder]);

  // Convert schedule assignments to calendar events
  const calendarEvents = useMemo<ScheduleCalendarEvent[]>(() => {
    if (!schedules || !shiftTypes) return [];

    const events: ScheduleCalendarEvent[] = [];

    schedules.forEach((schedule) => {
      if (!schedule.assignments) return;

      schedule.assignments.forEach((assignment) => {
        const shiftType = shiftTypes.find((st) => st.id === assignment.shiftTypeId);
        if (!shiftType) return;

        const date = new Date(assignment.shiftDate);
        const [startHours, startMinutes] = shiftType.startTime.split(':');
        const [endHours, endMinutes] = shiftType.endTime.split(':');

        const start = new Date(date);
        start.setHours(parseInt(startHours), parseInt(startMinutes));

        const end = new Date(date);
        end.setHours(parseInt(endHours), parseInt(endMinutes));

        // If end time is before start time, it means shift goes into next day
        if (end < start) {
          end.setDate(end.getDate() + 1);
        }

        const backgroundColor = shiftType.isNightShift ? '#1976d2' : '#4caf50';
        const borderColor = shiftType.isNightShift ? '#1565c0' : '#388e3c';

        events.push({
          id: assignment.id,
          title: `${assignment.user?.firstName || 'User'} ${assignment.user?.lastName || ''} - ${shiftType.name}`,
          start: start.toISOString(),
          end: end.toISOString(),
          backgroundColor,
          borderColor,
          extendedProps: {
            assignmentId: assignment.id,
            userId: assignment.userId,
            userName: `${assignment.user?.firstName || ''} ${assignment.user?.lastName || ''}`.trim(),
            shiftTypeId: assignment.shiftTypeId,
            shiftTypeName: shiftType.name,
            durationHours: assignment.durationHours,
            isNightShift: shiftType.isNightShift,
            notes: assignment.notes || undefined,
          },
        });
      });
    });

    return events;
  }, [schedules, shiftTypes]);

  const getStatusColor = (status: ScheduleStatus) => {
    switch (status) {
      case ScheduleStatus.DRAFT:
        return 'default';
      case ScheduleStatus.PENDING_APPROVAL:
        return 'warning';
      case ScheduleStatus.APPROVED:
        return 'success';
      case ScheduleStatus.ACTIVE:
        return 'primary';
      case ScheduleStatus.REJECTED:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: ScheduleStatus) => {
    switch (status) {
      case ScheduleStatus.DRAFT:
        return 'Draft';
      case ScheduleStatus.PENDING_APPROVAL:
        return 'Pending Approval';
      case ScheduleStatus.APPROVED:
        return 'Approved';
      case ScheduleStatus.ACTIVE:
        return 'Active';
      case ScheduleStatus.REJECTED:
        return 'Rejected';
      default:
        return status;
    }
  };

  const handleEventClick = (info: any) => {
    const event = info.event;
    console.log('Event clicked:', event.extendedProps);
    // You can show a detail dialog here if needed
  };

  const handleCreateSchedule = () => {
    navigate('/schedules/create');
  };

  const handleScheduleClick = (schedule: WorkSchedule) => {
    navigate(`/schedules/${schedule.id}`);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedSchedule(null);
  };

  const hasViolations = (schedule: WorkSchedule) => {
    return (schedule.laborLawValidation?.violations?.length ?? 0) > 0;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={{ xs: 2, sm: 3 }}>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2
        }}>
          <Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              gutterBottom
              sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
            >
              Programe de Lucru
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Gestionează programele lunare de lucru
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateSchedule}
            fullWidth={isMobile}
            sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
          >
            Creează Program
          </Button>
        </Box>

        {/* Month Selector */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarIcon color="action" fontSize="small" />
              <Typography variant="subtitle2" fontWeight="medium">Selectează Luna</Typography>
            </Stack>
            <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - 6 + i);
                  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  const label = date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });
                  return (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        {/* Filters and Sorting */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%' }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterIcon color="action" fontSize="small" />
              <Typography variant="subtitle2" fontWeight="medium">
                Filtre și Sortare
              </Typography>
            </Stack>
            <Stack spacing={2}>
              <TextField
                fullWidth
                placeholder="Caută după nume, departament..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="ALL">Toate</MenuItem>
                    <MenuItem value="DRAFT">Draft</MenuItem>
                    <MenuItem value="PENDING_APPROVAL">În Așteptare</MenuItem>
                    <MenuItem value="APPROVED">Aprobat</MenuItem>
                    <MenuItem value="ACTIVE">Activ</MenuItem>
                    <MenuItem value="REJECTED">Respins</MenuItem>
                    <MenuItem value="ARCHIVED">Arhivat</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Sortează după</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sortează după"
                  >
                    <MenuItem value="updatedAt">Ultima Actualizare</MenuItem>
                    <MenuItem value="createdAt">Data Creării</MenuItem>
                    <MenuItem value="name">Nume</MenuItem>
                    <MenuItem value="status">Status</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Ordine</InputLabel>
                  <Select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    label="Ordine"
                  >
                    <MenuItem value="desc">Descrescător</MenuItem>
                    <MenuItem value="asc">Crescător</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        {/* Schedule List */}
        {schedules && schedules.length > 0 ? (
          filteredSchedules.length > 0 ? (
            <Box>
              <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Programe pentru luna selectată ({filteredSchedules.length})
              </Typography>
              <Stack spacing={{ xs: 1.5, sm: 2 }}>
                {filteredSchedules.map((schedule) => (
                  <Card
                    key={schedule.id}
                    sx={{
                      width: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3,
                      },
                    }}
                    onClick={() => handleScheduleClick(schedule)}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        spacing={{ xs: 1.5, sm: 0 }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body1" fontWeight="medium" noWrap sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                            {schedule.name || `${schedule.department?.name || 'Toate Departamentele'} - ${schedule.year}-${String(schedule.month).padStart(2, '0')}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            Creat de: {schedule.creator?.fullName || 'Necunoscut'}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: { xs: 1, sm: 0 } }}>
                          {hasViolations(schedule) && (
                            <Chip
                              icon={<WarningIcon />}
                              label="Încălcări"
                              color="error"
                              size="small"
                            />
                          )}
                          <Chip
                            label={getStatusLabel(schedule.status as ScheduleStatus)}
                            color={getStatusColor(schedule.status as ScheduleStatus)}
                            size="small"
                          />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          ) : (
            <Alert severity="info">
              Nu s-au găsit programe cu filtrele selectate.
            </Alert>
          )
        ) : null}

        {/* Calendar - Hidden on mobile, shown on tablet and above */}
        {!isMobile && (
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
            {!isLoading && !error && (
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate={`${selectedMonth}-01`}
                events={calendarEvents}
                eventClick={handleEventClick}
                height="auto"
                headerToolbar={{
                  left: 'title',
                  center: '',
                  right: '',
                }}
                validRange={{
                  start: `${selectedMonth}-01`,
                  end: (() => {
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const nextMonth = new Date(year, month, 1);
                    return nextMonth.toISOString().split('T')[0];
                  })(),
                }}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }}
              />
            )}
          </Paper>
        )}

        {/* Mobile loading/error states */}
        {isMobile && isLoading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}
        {isMobile && error && (
          <Alert severity="error">
            Eroare la încărcarea programelor.
          </Alert>
        )}
      </Stack>

      {/* Schedule Details Dialog */}
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        <DialogTitle>Schedule Details</DialogTitle>
        <DialogContent>
          {selectedSchedule && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Month
                </Typography>
                <Typography variant="body1">
                  {new Date(
                    selectedSchedule.year,
                    selectedSchedule.month - 1,
                    1
                  ).toLocaleDateString('ro-RO', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={getStatusLabel(selectedSchedule.status as ScheduleStatus)}
                  color={getStatusColor(selectedSchedule.status as ScheduleStatus)}
                  size="small"
                />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Department
                </Typography>
                <Typography variant="body1">
                  {selectedSchedule.department?.name || 'All Departments'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Assignments
                </Typography>
                <Typography variant="body1">
                  {selectedSchedule.assignments?.length || 0}
                </Typography>
              </Box>
              {selectedSchedule.laborLawValidation && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Labor Law Validation
                  </Typography>
                  {selectedSchedule.laborLawValidation.violations?.length > 0 && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {selectedSchedule.laborLawValidation.violations.length} Critical Violations
                      </Typography>
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                        {selectedSchedule.laborLawValidation.violations.map((v: any, i: number) => (
                          <li key={i}>{v.message}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                  {selectedSchedule.laborLawValidation.warnings?.length > 0 && (
                    <Alert severity="warning">
                      <Typography variant="body2" fontWeight="bold">
                        {selectedSchedule.laborLawValidation.warnings.length} Warnings
                      </Typography>
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                        {selectedSchedule.laborLawValidation.warnings.map((w: any, i: number) => (
                          <li key={i}>{w.message}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                  {selectedSchedule.laborLawValidation.isValid && (
                    <Alert severity="success">
                      No labor law violations detected
                    </Alert>
                  )}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SchedulesPage;
