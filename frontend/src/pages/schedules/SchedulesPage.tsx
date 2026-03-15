import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarMonth as CalendarMonthIcon,
  Group as GroupIcon,
  HourglassEmpty as PendingIcon,
  EventBusy as EventBusyIcon,
  CheckCircle as ApprovedIcon,
} from '@mui/icons-material';
import { GradientHeader, EmptyState } from '../../components/common';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useGetApprovedLeavesByMonthQuery } from '../../store/api/leaveRequests.api';
import { DISPECERAT_DEPARTMENT_NAME, CONTROL_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME } from '../../constants/departments';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { isAdminOrAbove } from '../../utils/roleHelpers';
import {
  ScheduleFilters,
  ScheduleLegend,
  ScheduleMobileCard,
  ScheduleDesktopTable,
  ScheduleEditDialog,
  generateMonthOptions,
  getExistingShiftInfo,
} from './components';
import type {
  ShiftFilter,
  DayFilter,
  WorkPositionFilter,
  AssignmentInfo,
} from './components';
import type { HighlightScheduleState } from '../../types/navigation.types';

const SchedulesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const navigate = useNavigate();
  const location = useLocation();
  const hasHandledState = useRef(false);
  const highlightMonthYear = (location.state as HighlightScheduleState | null)?.highlightMonthYear;
  const { user } = useAppSelector((state) => state.auth);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    // If navigating from notification, use the notification's monthYear
    const stateMonthYear = (location.state as HighlightScheduleState | null)?.highlightMonthYear;
    if (stateMonthYear && /^\d{4}-\d{2}$/.test(stateMonthYear)) {
      return stateMonthYear;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Handle navigation from notification — clean up history state
  useEffect(() => {
    if (highlightMonthYear && !hasHandledState.current) {
      hasHandledState.current = true;
      window.history.replaceState({}, document.title);
    }
  }, [highlightMonthYear]);

  // Filtering state
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [dayFilter, setDayFilter] = useState<DayFilter>('ALL');
  const [workPositionFilter, setWorkPositionFilter] = useState<WorkPositionFilter>('ALL');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Legend collapse state (collapsed by default on mobile)
  const [legendExpanded, setLegendExpanded] = useState(!isMobile);

  // Month options (generated once)
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const { data: schedules = [], isLoading, error } = useGetSchedulesQuery({
    monthYear: selectedMonth,
  });
  const { data: users = [] } = useGetUsersQuery({ isActive: true });
  const { data: approvedLeaves = [] } = useGetApprovedLeavesByMonthQuery(selectedMonth);

  // Check if current user is admin
  const isAdmin = isAdminOrAbove(user?.role);
  const isManager = user?.role === 'MANAGER';

  // Filter only employees and managers
  const eligibleUsers = useMemo(() => {
    return users.filter(u => u.role === 'USER' || u.role === 'MANAGER');
  }, [users]);

  // Extract unique department list
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

  // Extract unique work positions (Dispecerat, Control, etc.)
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

  // Generate days for the month
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

  // Create a map of all existing assignments for all employees
  // Includes schedule status and work position
  // Includes approved leaves that don't have assignments yet
  const allUsersAssignments = useMemo(() => {
    const userAssignmentsMap: Record<string, {
      assignments: Record<string, AssignmentInfo[]>;
      scheduleId?: string;
      status?: string;
    }> = {};

    // First, add approved leaves for this month
    approvedLeaves.forEach(leave => {
      if (!userAssignmentsMap[leave.userId]) {
        userAssignmentsMap[leave.userId] = {
          assignments: {},
        };
      }
      leave.dates.forEach(date => {
        userAssignmentsMap[leave.userId].assignments[date] = [{
          shiftId: 'vacation',
          notes: 'Concediu',
          isApprovedLeave: true,
        }];
      });
    });

    // Then, add assignments from schedules (these overwrite leaves if they exist)
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
          // Normalize date to avoid timezone issues
          const normalizedDate = assignment.shiftDate.split('T')[0];
          const newEntry: AssignmentInfo = {
            shiftId: assignment.shiftTypeId,
            notes: assignment.notes || '',
            workPosition: assignment.workPosition ? {
              shortName: assignment.workPosition.shortName,
              name: assignment.workPosition.name,
              color: assignment.workPosition.color,
            } : undefined,
          };
          // If the date already exists and is a leave, overwrite; otherwise, push to array
          const existing = userAssignmentsMap[assignment.userId].assignments[normalizedDate];
          if (existing && existing.length === 1 && existing[0].isApprovedLeave) {
            userAssignmentsMap[assignment.userId].assignments[normalizedDate] = [newEntry];
          } else if (existing) {
            existing.push(newEntry);
          } else {
            userAssignmentsMap[assignment.userId].assignments[normalizedDate] = [newEntry];
          }
          userAssignmentsMap[assignment.userId].scheduleId = schedule.id;
          userAssignmentsMap[assignment.userId].status = schedule.status;
        });
      }
    });

    return userAssignmentsMap;
  }, [schedules, approvedLeaves]);

  // Filter users
  const filteredUsers = useMemo(() => {
    let filtered = [...eligibleUsers];

    // Calculate target date if we have a day filter
    const [yearNum, monthNum] = selectedMonth.split('-').map(Number);
    const targetDate = dayFilter !== 'ALL'
      ? `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayFilter).padStart(2, '0')}`
      : null;

    // Filter by name
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(user =>
        user.fullName.toLowerCase().includes(query)
      );
    }

    // Filter by department
    if (departmentFilter !== 'ALL') {
      filtered = filtered.filter(user => user.department?.id === departmentFilter);
    }

    // Filter by specific day - show only users who have a shift on the selected day
    if (targetDate) {
      filtered = filtered.filter(user => {
        const userAssignments = allUsersAssignments[user.id]?.assignments || {};
        return userAssignments[targetDate] !== undefined;
      });
    }

    // Filter by shift type - considers the day filter
    if (shiftFilter !== 'ALL') {
      filtered = filtered.filter(user => {
        const userAssignments = allUsersAssignments[user.id]?.assignments || {};

        if (shiftFilter === 'FREE') {
          if (targetDate) {
            return userAssignments[targetDate] === undefined;
          }
          return Object.keys(userAssignments).length === 0;
        }

        if (targetDate) {
          const assignments = userAssignments[targetDate];
          if (!assignments) return false;
          return assignments.some(a => getExistingShiftInfo(a.notes).type === shiftFilter);
        }

        return Object.values(userAssignments).some(assignments =>
          assignments.some(a => getExistingShiftInfo(a.notes).type === shiftFilter)
        );
      });
    }

    // Filter by work position (Dispecerat/Control) - considers the day filter
    if (workPositionFilter !== 'ALL') {
      filtered = filtered.filter(user => {
        const userAssignments = allUsersAssignments[user.id]?.assignments || {};

        if (targetDate) {
          const assignments = userAssignments[targetDate];
          if (!assignments) return false;
          return assignments.some(a =>
            a.workPosition?.shortName === workPositionFilter ||
            a.workPosition?.name === workPositionFilter
          );
        }

        return Object.values(userAssignments).some(assignments =>
          assignments.some(a =>
            a.workPosition?.shortName === workPositionFilter ||
            a.workPosition?.name === workPositionFilter
          )
        );
      });
    }

    // Sort by department: Dispecerat -> Control -> Intretinere Parcari
    const departmentOrder: Record<string, number> = {
      [DISPECERAT_DEPARTMENT_NAME]: 1,
      [CONTROL_DEPARTMENT_NAME]: 2,
      [MAINTENANCE_DEPARTMENT_NAME]: 3,
    };

    filtered.sort((a, b) => {
      const deptA = a.department?.name || '';
      const deptB = b.department?.name || '';

      const orderA = departmentOrder[deptA] || 99;
      const orderB = departmentOrder[deptB] || 99;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.fullName.localeCompare(b.fullName);
    });

    return filtered;
  }, [eligibleUsers, debouncedSearch, departmentFilter, shiftFilter, dayFilter, workPositionFilter, selectedMonth, allUsersAssignments]);

  const handleCreateSchedule = () => {
    navigate('/schedules/create');
  };

  // Check if user can edit the schedule
  const canEditSchedule = (targetUser: any) => {
    if (isAdmin) {
      return true;
    }
    if (isManager && targetUser.role === 'USER') {
      return true;
    }
    return false;
  };

  // Handler for edit click
  const handleEditClick = (targetUser: any) => {
    setSelectedUser(targetUser);
    setEditDialogOpen(true);
  };

  // Navigate to edit page
  const handleConfirmEdit = () => {
    if (selectedUser) {
      navigate(`/schedules/create?userId=${selectedUser.id}&month=${selectedMonth}`);
    }
    setEditDialogOpen(false);
  };

  // Get schedule status for a user
  const getScheduleStatus = (userId: string) => {
    return allUsersAssignments[userId]?.status;
  };

  // Calculate stats for header
  const pendingCount = schedules.filter(s => s.status === 'PENDING_APPROVAL').length;
  const approvedCount = schedules.filter(s => s.status === 'APPROVED').length;
  const totalCount = schedules.length;

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || departmentFilter !== 'ALL' || shiftFilter !== 'ALL' || workPositionFilter !== 'ALL' || dayFilter !== 'ALL';

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setDepartmentFilter('ALL');
    setShiftFilter('ALL');
    setWorkPositionFilter('ALL');
    setDayFilter('ALL');
  }, []);

  // Get selected month label
  const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || '';

  // Handle month change - also reset day filter
  const handleMonthChange = useCallback((month: string) => {
    setSelectedMonth(month);
    setDayFilter('ALL');
  }, []);

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

        {/* Month Selector and Filters */}
        <ScheduleFilters
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          monthOptions={monthOptions}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={setDepartmentFilter}
          departments={departments}
          shiftFilter={shiftFilter}
          onShiftFilterChange={setShiftFilter}
          workPositionFilter={workPositionFilter}
          onWorkPositionFilterChange={setWorkPositionFilter}
          workPositions={workPositions}
          dayFilter={dayFilter}
          onDayFilterChange={setDayFilter}
          calendarDays={calendarDays}
        />

        {/* Legend - collapsible on mobile */}
        <ScheduleLegend
          isMobile={isMobile}
          legendExpanded={legendExpanded}
          onToggleLegend={() => setLegendExpanded(!legendExpanded)}
        />

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

        {/* Table with all employees and their schedules */}
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
                      {filteredUsers.map((targetUser, index) => (
                        <ScheduleMobileCard
                          key={targetUser.id}
                          targetUser={targetUser}
                          index={index}
                          userAssignments={allUsersAssignments[targetUser.id]?.assignments || {}}
                          scheduleStatus={getScheduleStatus(targetUser.id)}
                          canEdit={canEditSchedule(targetUser)}
                          calendarDays={calendarDays}
                          isMobile={isMobile}
                          isLandscape={isLandscape}
                          onEditClick={handleEditClick}
                        />
                      ))}
                    </Stack>
                  ) : (
                    /* Desktop View - Table layout */
                    <ScheduleDesktopTable
                      filteredUsers={filteredUsers}
                      allUsersAssignments={allUsersAssignments}
                      calendarDays={calendarDays}
                      isAdmin={isAdmin}
                      onEditClick={handleEditClick}
                      canEditSchedule={canEditSchedule}
                      getScheduleStatus={getScheduleStatus}
                    />
                  )}
                </>
              ) : (
                <EmptyState
                  icon={<EventBusyIcon />}
                  title="Nu s-au gasit angajati"
                  description="Incearca sa schimbi filtrele sau sa resetezi cautarea"
                  illustration="noResults"
                  actionLabel={hasActiveFilters ? 'Reseteaza Filtrele' : undefined}
                  onAction={hasActiveFilters ? handleResetFilters : undefined}
                />
              )}
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Edit confirmation dialog */}
      <ScheduleEditDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onConfirm={handleConfirmEdit}
        selectedUser={selectedUser}
        selectedMonth={selectedMonth}
        isAdmin={isAdmin}
        isMobile={isMobile}
      />
    </Box>
  );
};

export default SchedulesPage;
