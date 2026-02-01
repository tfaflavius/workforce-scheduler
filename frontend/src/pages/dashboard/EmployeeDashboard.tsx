import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
  CircularProgress,
  Avatar,
  IconButton,
  Divider,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Today as TodayIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  WbSunny as DayIcon,
  NightsStay as NightIcon,
  EventBusy as NoShiftIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useAppSelector } from '../../store/hooks';
import type { WorkSchedule, ScheduleAssignment } from '../../types/schedule.types';

interface ShiftCardProps {
  date: Date;
  assignment?: ScheduleAssignment;
  isToday: boolean;
}

const ShiftCard = ({ date, assignment, isToday }: ShiftCardProps) => {
  const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam'];
  const dayOfWeek = dayNames[date.getDay()];

  return (
    <Card
      sx={{
        border: isToday ? '2px solid' : '1px solid',
        borderColor: isToday ? 'primary.main' : 'divider',
        bgcolor: isToday ? 'primary.lighter' : assignment ? 'white' : 'grey.50',
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={0.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {dayOfWeek}
            </Typography>
            <Typography variant="subtitle2" fontWeight="bold">
              {date.getDate()}
            </Typography>
          </Stack>
          <Divider />
          {assignment ? (
            <Box sx={{ pt: 0.5 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                {assignment.shiftType?.isNightShift ? (
                  <NightIcon sx={{ fontSize: 16, color: 'info.main' }} />
                ) : (
                  <DayIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                )}
                <Typography variant="caption" fontWeight="medium">
                  {assignment.shiftType?.name || 'Tura'}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block">
                {assignment.shiftType?.startTime}-{assignment.shiftType?.endTime}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ py: 1, textAlign: 'center' }}>
              <NoShiftIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
              <Typography variant="caption" color="text.disabled" display="block">
                Liber
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

const EmployeeDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const monthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const { data: schedules, isLoading } = useGetSchedulesQuery({
    monthYear,
    status: 'APPROVED',
  });

  const myAssignments = useMemo(() => {
    if (!schedules || !user) return [];
    const allAssignments: ScheduleAssignment[] = [];
    schedules.forEach((schedule: WorkSchedule) => {
      if (schedule.assignments) {
        const userAssignments = schedule.assignments.filter(
          (a) => a.userId === user.id
        );
        allAssignments.push(...userAssignments);
      }
    });
    return allAssignments;
  }, [schedules, user]);

  const getAssignmentForDate = (date: Date): ScheduleAssignment | undefined => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return myAssignments.find((a) => {
      // Handle both string dates and Date objects
      const assignmentDate = typeof a.shiftDate === 'string'
        ? a.shiftDate.split('T')[0]
        : new Date(a.shiftDate).toISOString().split('T')[0];
      return assignmentDate === dateStr;
    });
  };

  const getWeekDates = () => {
    const dates: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    // Dacă e Duminică (day=0), săptămâna începe cu 6 zile în urmă (Luni trecut)
    // Altfel, săptămâna începe Luni (day-1 zile în urmă)
    const daysToSubtract = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const weekDates = getWeekDates();
  const todayAssignment = getAssignmentForDate(new Date());

  const totalHoursThisMonth = myAssignments.reduce(
    (sum, a) => sum + (a.durationHours || 0),
    0
  );
  const totalShiftsThisMonth = myAssignments.length;
  const nightShifts = myAssignments.filter((a) => a.shiftType?.isNightShift).length;

  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          gutterBottom
          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' } }}
        >
          Programul Meu
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
          Bun venit, {user?.fullName}
        </Typography>
      </Box>

      {/* Today's Shift */}
      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          mb: { xs: 2, sm: 3, md: 4 },
          background: todayAssignment
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
          color: todayAssignment ? 'white' : 'text.primary',
        }}
      >
        <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }}>
              <Avatar
                sx={{
                  width: { xs: 48, sm: 64 },
                  height: { xs: 48, sm: 64 },
                  bgcolor: todayAssignment ? 'rgba(255,255,255,0.2)' : 'primary.main',
                }}
              >
                <TodayIcon sx={{ fontSize: { xs: 24, sm: 32 } }} />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="overline"
                  sx={{ opacity: 0.8, fontSize: { xs: '0.6rem', sm: '0.75rem' }, display: 'block' }}
                >
                  Azi, {new Date().toLocaleDateString('ro-RO', {
                    weekday: isMobile ? 'short' : 'long',
                    day: 'numeric',
                    month: isMobile ? 'short' : 'long'
                  })}
                </Typography>
                {todayAssignment ? (
                  <>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}
                      noWrap
                    >
                      {todayAssignment.shiftType?.name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {todayAssignment.shiftType?.startTime} - {todayAssignment.shiftType?.endTime} ({todayAssignment.durationHours}h)
                    </Typography>
                  </>
                ) : (
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}
                  >
                    Zi Liberă
                  </Typography>
                )}
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={0.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ opacity: 0.8, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Ore lună:</Typography>
                <Typography variant="caption" fontWeight="bold" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{totalHoursThisMonth}h</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ opacity: 0.8, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Ture:</Typography>
                <Typography variant="caption" fontWeight="bold" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{totalShiftsThisMonth}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ opacity: 0.8, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Noapte:</Typography>
                <Typography variant="caption" fontWeight="bold" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{nightShifts}</Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Week Calendar */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            <IconButton onClick={() => navigateWeek('prev')} size={isMobile ? 'small' : 'medium'}>
              <PrevIcon />
            </IconButton>
            <Typography
              variant="subtitle1"
              fontWeight="600"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }, textAlign: 'center' }}
            >
              {weekDates[0]?.getDate()} - {weekDates[6]?.getDate()} {monthNames[weekDates[0]?.getMonth()]?.substring(0, 3)}
            </Typography>
            <IconButton onClick={() => navigateWeek('next')} size={isMobile ? 'small' : 'medium'}>
              <NextIcon />
            </IconButton>
          </Stack>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/my-schedule')}
            fullWidth={isMobile}
            sx={{ minHeight: { xs: 40, sm: 36 } }}
          >
            Program Complet
          </Button>
        </Stack>

        {/* Mobile: 2 per row, Desktop: 7 per row */}
        <Grid container spacing={1}>
          {weekDates.map((date) => (
            <Grid size={{ xs: 6, sm: 12 / 7 }} key={date.toISOString()}>
              <ShiftCard
                date={date}
                assignment={getAssignmentForDate(date)}
                isToday={isToday(date)}
              />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={{ xs: 2, sm: 3 }} justifyContent="center" flexWrap="wrap">
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <DayIcon sx={{ color: 'warning.main', fontSize: { xs: 16, sm: 20 } }} />
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Zi</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <NightIcon sx={{ color: 'info.main', fontSize: { xs: 16, sm: 20 } }} />
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Noapte</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <NoShiftIcon sx={{ color: 'text.disabled', fontSize: { xs: 16, sm: 20 } }} />
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Liber</Typography>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default EmployeeDashboard;
