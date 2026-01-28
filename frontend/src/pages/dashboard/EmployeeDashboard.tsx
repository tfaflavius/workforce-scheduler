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
    const dateStr = date.toISOString().split('T')[0];
    return myAssignments.find((a) => a.shiftDate === dateStr);
  };

  const getWeekDates = () => {
    const dates: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);
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
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Programul Meu
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bun venit, {user?.fullName}
        </Typography>
      </Box>

      {/* Today's Shift */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          background: todayAssignment
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
          color: todayAssignment ? 'white' : 'text.primary',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: todayAssignment ? 'rgba(255,255,255,0.2)' : 'primary.main',
                }}
              >
                <TodayIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>
                  Azi, {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Typography>
                {todayAssignment ? (
                  <>
                    <Typography variant="h5" fontWeight="bold">
                      {todayAssignment.shiftType?.name}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      {todayAssignment.shiftType?.startTime} - {todayAssignment.shiftType?.endTime} ({todayAssignment.durationHours}h)
                    </Typography>
                  </>
                ) : (
                  <Typography variant="h5" fontWeight="bold">
                    Zi Libera
                  </Typography>
                )}
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Ore luna aceasta:</Typography>
                <Typography variant="body2" fontWeight="bold">{totalHoursThisMonth}h</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Ture programate:</Typography>
                <Typography variant="body2" fontWeight="bold">{totalShiftsThisMonth}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Ture de noapte:</Typography>
                <Typography variant="body2" fontWeight="bold">{nightShifts}</Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Week Calendar */}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={() => navigateWeek('prev')}>
              <PrevIcon />
            </IconButton>
            <Typography variant="h6" fontWeight="600">
              Saptamana {weekDates[0]?.getDate()} - {weekDates[6]?.getDate()} {monthNames[weekDates[0]?.getMonth()]}
            </Typography>
            <IconButton onClick={() => navigateWeek('next')}>
              <NextIcon />
            </IconButton>
          </Stack>
          <Button variant="outlined" size="small" onClick={() => navigate('/my-schedule')}>
            Vezi Programul Complet
          </Button>
        </Stack>

        <Grid container spacing={1}>
          {weekDates.map((date) => (
            <Grid size={{ xs: 12 / 7 }} key={date.toISOString()}>
              <ShiftCard
                date={date}
                assignment={getAssignmentForDate(date)}
                isToday={isToday(date)}
              />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={3} justifyContent="center">
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <DayIcon sx={{ color: 'warning.main', fontSize: 20 }} />
              <Typography variant="caption">Zi</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <NightIcon sx={{ color: 'info.main', fontSize: 20 }} />
              <Typography variant="caption">Noapte</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <NoShiftIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
              <Typography variant="caption">Liber</Typography>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default EmployeeDashboard;
