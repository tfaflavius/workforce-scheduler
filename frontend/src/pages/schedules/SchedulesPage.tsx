import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
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
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
  FilterList as FilterIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useGetSchedulesQuery, useGetShiftTypesQuery } from '../../store/api/schedulesApi';
import { ScheduleStatus, type ScheduleCalendarEvent, type WorkSchedule } from '../../types/schedule.types';
import { useNavigate } from 'react-router-dom';

const SchedulesPage: React.FC = () => {
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={() => navigate('/')} color="primary">
              <HomeIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" gutterBottom>
                Work Schedules
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage monthly work schedules with labor law compliance
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateSchedule}
          >
            Create Schedule
          </Button>
        </Stack>

        {/* Month Selector */}
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CalendarIcon color="action" />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Select Month</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                label="Select Month"
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
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterIcon color="action" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Filters & Sorting
              </Typography>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Search by name, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="PENDING_APPROVAL">Pending Approval</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="ARCHIVED">Archived</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="updatedAt">Last Updated</MenuItem>
                  <MenuItem value="createdAt">Date Created</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Order</InputLabel>
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  label="Order"
                >
                  <MenuItem value="desc">Descending</MenuItem>
                  <MenuItem value="asc">Ascending</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Stack>
        </Paper>

        {/* Schedule List */}
        {schedules && schedules.length > 0 ? (
          filteredSchedules.length > 0 ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Schedules for Selected Month ({filteredSchedules.length})
              </Typography>
              <Stack spacing={1}>
                {filteredSchedules.map((schedule) => (
                  <Paper
                    key={schedule.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => handleScheduleClick(schedule)}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body1">
                          {schedule.name || `${schedule.department?.name || 'All Departments'} - ${schedule.year}-${String(schedule.month).padStart(2, '0')}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Created by: {schedule.creator?.fullName || 'Unknown'}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {hasViolations(schedule) && (
                          <Chip
                            icon={<WarningIcon />}
                            label="Violations"
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
                  </Paper>
                ))}
              </Stack>
            </Paper>
          ) : (
            <Paper sx={{ p: 3 }}>
              <Alert severity="info">
                No schedules match your current filters. Try adjusting the search or status filter.
              </Alert>
            </Paper>
          )
        ) : null}

        {/* Calendar */}
        <Paper sx={{ p: 2 }}>
          {isLoading && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}
          {error && (
            <Alert severity="error">
              Failed to load schedules. Please try again.
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
    </Container>
  );
};

export default SchedulesPage;
