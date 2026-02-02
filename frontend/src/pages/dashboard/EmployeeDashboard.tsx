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
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useAppSelector } from '../../store/hooks';
import type { WorkSchedule, ScheduleAssignment } from '../../types/schedule.types';

interface ShiftCardProps {
  date: Date;
  assignment?: ScheduleAssignment;
  isToday: boolean;
  isWeekend: boolean;
}

const ShiftCard = ({ date, assignment, isToday, isWeekend }: ShiftCardProps) => {
  const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
  const dayOfWeek = dayNames[date.getDay()];

  return (
    <Card
      sx={{
        border: isToday ? '2px solid' : '1px solid',
        borderColor: isToday ? 'primary.main' : 'divider',
        bgcolor: isToday ? 'primary.lighter' : assignment ? 'white' : isWeekend ? 'grey.100' : 'grey.50',
        minHeight: { xs: 70, sm: 80 },
      }}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Stack spacing={0.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography
              variant="caption"
              color={isWeekend ? 'error.main' : 'text.secondary'}
              sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}
            >
              {dayOfWeek}
            </Typography>
            <Typography
              variant="subtitle2"
              fontWeight="bold"
              color={isWeekend && !assignment ? 'error.main' : 'text.primary'}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
            >
              {date.getDate()}
            </Typography>
          </Stack>
          <Divider />
          {assignment ? (
            <Box sx={{ pt: 0.25 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                {assignment.shiftType?.isNightShift ? (
                  <NightIcon sx={{ fontSize: { xs: 12, sm: 14 }, color: 'info.main' }} />
                ) : (
                  <DayIcon sx={{ fontSize: { xs: 12, sm: 14 }, color: 'warning.main' }} />
                )}
                <Typography variant="caption" fontWeight="medium" sx={{ fontSize: { xs: '0.55rem', sm: '0.65rem' } }}>
                  {assignment.shiftType?.name || 'Tura'}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.6rem' } }}>
                {assignment.shiftType?.startTime}-{assignment.shiftType?.endTime}
              </Typography>
              {/* Poziția de lucru */}
              {assignment.workPosition && (
                <Box
                  sx={{
                    mt: 0.25,
                    px: 0.5,
                    py: 0.1,
                    bgcolor: assignment.workPosition.color || '#2196F3',
                    borderRadius: 0.5,
                    display: 'inline-block',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: { xs: '0.45rem', sm: '0.55rem' },
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    {assignment.workPosition.shortName || assignment.workPosition.name}
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ py: 0.5, textAlign: 'center' }}>
              <NoShiftIcon sx={{ color: 'text.disabled', fontSize: { xs: 14, sm: 16 } }} />
              <Typography variant="caption" color="text.disabled" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.6rem' } }}>
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

  // Obține toate zilele din luna curentă
  const getMonthDates = () => {
    const dates: Date[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(year, month, i));
    }
    return dates;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const monthDates = getMonthDates();
  const todayAssignment = getAssignmentForDate(new Date());

  const totalHoursThisMonth = myAssignments.reduce(
    (sum, a) => sum + (a.durationHours || 0),
    0
  );
  const totalShiftsThisMonth = myAssignments.length;
  const nightShifts = myAssignments.filter((a) => a.shiftType?.isNightShift).length;
  const dayShifts = totalShiftsThisMonth - nightShifts;

  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
  ];

  const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

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
            : 'linear-gradient(135deg, #43a047 0%, #1b5e20 100%)',
          color: 'white',
        }}
      >
        <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }}>
              <Avatar
                sx={{
                  width: { xs: 48, sm: 64 },
                  height: { xs: 48, sm: 64 },
                  bgcolor: 'rgba(255,255,255,0.2)',
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
                    {/* Poziția de lucru pentru azi */}
                    {todayAssignment.workPosition && (
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                        <LocationIcon sx={{ fontSize: 16 }} />
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            bgcolor: 'rgba(255,255,255,0.2)',
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            📍 {todayAssignment.workPosition.name}
                          </Typography>
                        </Box>
                      </Stack>
                    )}
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
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'rgba(255,255,255,0.1)' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.8, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                Sumar {monthNames[currentMonth - 1]} {currentYear}
              </Typography>
              <Grid container spacing={1}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{totalHoursThisMonth}h</Typography>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>Total Ore</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{totalShiftsThisMonth}</Typography>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>Total Ture</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{dayShifts}</Typography>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>Ture Zi</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{nightShifts}</Typography>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>Ture Noapte</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Monthly Calendar */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            <IconButton onClick={() => navigateMonth('prev')} size={isMobile ? 'small' : 'medium'}>
              <PrevIcon />
            </IconButton>
            <Typography
              variant="subtitle1"
              fontWeight="600"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }, textAlign: 'center', minWidth: { xs: 120, sm: 180 } }}
            >
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Typography>
            <IconButton onClick={() => navigateMonth('next')} size={isMobile ? 'small' : 'medium'}>
              <NextIcon />
            </IconButton>
            <Button variant="text" onClick={goToToday} size="small" sx={{ ml: 1 }}>
              Azi
            </Button>
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

        {/* Day Headers */}
        {!isMobile && (
          <Grid container sx={{ mb: 1 }}>
            {dayNames.map((day, index) => (
              <Grid size={{ xs: 12 / 7 }} key={day}>
                <Typography
                  variant="caption"
                  textAlign="center"
                  color={index === 0 || index === 6 ? 'error.main' : 'text.secondary'}
                  fontWeight="medium"
                  sx={{ display: 'block', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                >
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Calendar Grid */}
        {!isMobile ? (
          <Grid container spacing={0.5}>
            {/* Empty cells for first week alignment */}
            {Array.from({ length: monthDates[0]?.getDay() || 0 }).map((_, i) => (
              <Grid size={{ xs: 12 / 7 }} key={`empty-${i}`}>
                <Box sx={{ minHeight: { xs: 70, sm: 80 } }} />
              </Grid>
            ))}
            {monthDates.map((date) => {
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <Grid size={{ xs: 12 / 7 }} key={date.toISOString()}>
                  <ShiftCard
                    date={date}
                    assignment={getAssignmentForDate(date)}
                    isToday={isToday(date)}
                    isWeekend={isWeekend}
                  />
                </Grid>
              );
            })}
          </Grid>
        ) : (
          // Mobile: List view
          <Stack spacing={1}>
            {monthDates.map((date) => {
              const assignment = getAssignmentForDate(date);
              const today = isToday(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <Card
                  key={date.toISOString()}
                  sx={{
                    border: today ? '2px solid' : '1px solid',
                    borderColor: today ? 'primary.main' : 'divider',
                    bgcolor: today ? 'primary.lighter' : assignment ? 'white' : 'grey.50',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ minWidth: 40, textAlign: 'center' }}>
                          <Typography variant="caption" color={isWeekend ? 'error.main' : 'text.secondary'} sx={{ display: 'block', fontSize: '0.65rem' }}>
                            {dayNames[date.getDay()]}
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            color={isWeekend && !assignment ? 'error.main' : 'text.primary'}
                            sx={{ lineHeight: 1 }}
                          >
                            {date.getDate()}
                          </Typography>
                        </Box>
                        {assignment ? (
                          <Box>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              {assignment.shiftType?.isNightShift ? (
                                <NightIcon sx={{ fontSize: 16, color: 'info.main' }} />
                              ) : (
                                <DayIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                              )}
                              <Typography variant="body2" fontWeight="medium">
                                {assignment.shiftType?.name || 'Tura'}
                              </Typography>
                              {/* Poziția de lucru pe mobile */}
                              {assignment.workPosition && (
                                <Box
                                  sx={{
                                    ml: 0.5,
                                    px: 0.75,
                                    py: 0.1,
                                    bgcolor: assignment.workPosition.color || '#2196F3',
                                    borderRadius: 0.5,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontSize: '0.6rem',
                                      color: 'white',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {assignment.workPosition.shortName}
                                  </Typography>
                                </Box>
                              )}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {assignment.shiftType?.startTime} - {assignment.shiftType?.endTime}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            Zi liberă
                          </Typography>
                        )}
                      </Stack>
                      {today && (
                        <Typography variant="caption" color="primary" fontWeight="bold">
                          Azi
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}

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
