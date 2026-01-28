import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Chip,
  CircularProgress,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Button,
} from '@mui/material';
import {
  Today as TodayIcon,
  AccessTime as TimeIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  WbSunny as DayIcon,
  NightsStay as NightIcon,
  EventBusy as NoShiftIcon,
  WorkHistory as HoursIcon,
  EventAvailable as ShiftIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useAppSelector } from '../../store/hooks';
import type { WorkSchedule, ScheduleAssignment } from '../../types/schedule.types';

const MySchedulePage = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const monthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const { data: schedules, isLoading } = useGetSchedulesQuery({
    monthYear,
    status: 'APPROVED',
  });

  // Get all assignments for current user
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
    // Sort by date
    return allAssignments.sort(
      (a, b) => new Date(a.shiftDate).getTime() - new Date(b.shiftDate).getTime()
    );
  }, [schedules, user]);

  const getAssignmentForDate = (date: Date): ScheduleAssignment | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return myAssignments.find((a) => a.shiftDate === dateStr);
  };

  const getDatesForView = () => {
    const dates: Date[] = [];

    if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day + 1);

      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date);
      }
    } else {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 1; i <= daysInMonth; i++) {
        dates.push(new Date(year, month, i));
      }
    }

    return dates;
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
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

  const dates = getDatesForView();
  const todayAssignment = getAssignmentForDate(new Date());

  // Statistics
  const totalHours = myAssignments.reduce((sum, a) => sum + (a.durationHours || 0), 0);
  const totalShifts = myAssignments.length;
  const dayShifts = myAssignments.filter((a) => !a.shiftType?.isNightShift).length;
  const nightShifts = myAssignments.filter((a) => a.shiftType?.isNightShift).length;

  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
  ];

  const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
  const dayNamesFull = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Programul Meu de Lucru
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Vizualizează programul tău zilnic și lunar
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<PrintIcon />} disabled>
            Printează
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} disabled>
            Exportă
          </Button>
        </Stack>
      </Stack>

      {/* Today's Shift Card */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          background: todayAssignment
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #43a047 0%, #1b5e20 100%)',
          color: 'white',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" alignItems="center" spacing={3}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'rgba(255,255,255,0.2)',
                }}
              >
                <TodayIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>
                  Azi, {new Date().toLocaleDateString('ro-RO', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Typography>
                {todayAssignment ? (
                  <>
                    <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>
                      {todayAssignment.shiftType?.name}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Chip
                        icon={todayAssignment.shiftType?.isNightShift ? <NightIcon /> : <DayIcon />}
                        label={todayAssignment.shiftType?.isNightShift ? 'Tură de Noapte' : 'Tură de Zi'}
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                      />
                      <Typography variant="h6">
                        {todayAssignment.shiftType?.startTime} - {todayAssignment.shiftType?.endTime}
                      </Typography>
                    </Stack>
                  </>
                ) : (
                  <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>
                    Zi Liberă
                  </Typography>
                )}
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, opacity: 0.8 }}>
                Sumar Luna {monthNames[currentMonth - 1]}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="h4" fontWeight="bold">{totalHours}h</Typography>
                  <Typography variant="caption">Total Ore</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="h4" fontWeight="bold">{totalShifts}</Typography>
                  <Typography variant="caption">Total Ture</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="h4" fontWeight="bold">{dayShifts}</Typography>
                  <Typography variant="caption">Ture de Zi</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="h4" fontWeight="bold">{nightShifts}</Typography>
                  <Typography variant="caption">Ture de Noapte</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Calendar View */}
      <Paper sx={{ p: 3 }}>
        {/* Calendar Controls */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigatePeriod('prev')}>
              <PrevIcon />
            </IconButton>
            <Typography variant="h6" fontWeight="600" sx={{ minWidth: 250, textAlign: 'center' }}>
              {viewMode === 'week'
                ? `${dates[0]?.getDate()} - ${dates[6]?.getDate()} ${monthNames[dates[0]?.getMonth()]} ${dates[0]?.getFullYear()}`
                : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            </Typography>
            <IconButton onClick={() => navigatePeriod('next')}>
              <NextIcon />
            </IconButton>
            <Button variant="text" onClick={goToToday}>
              Azi
            </Button>
          </Stack>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => value && setViewMode(value)}
            size="small"
          >
            <ToggleButton value="week">Săptămânal</ToggleButton>
            <ToggleButton value="month">Lunar</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Week Day Headers (for month view) */}
        {viewMode === 'month' && (
          <Grid container sx={{ mb: 1 }}>
            {dayNames.map((day, index) => (
              <Grid size={{ xs: 12 / 7 }} key={day}>
                <Typography
                  variant="subtitle2"
                  textAlign="center"
                  color={index === 0 || index === 6 ? 'error.main' : 'text.secondary'}
                  fontWeight="medium"
                >
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Calendar Grid */}
        {viewMode === 'month' ? (
          <Grid container spacing={1}>
            {/* Empty cells for first week alignment */}
            {Array.from({ length: (dates[0]?.getDay() + 6) % 7 }).map((_, i) => (
              <Grid size={{ xs: 12 / 7 }} key={`empty-${i}`}>
                <Box sx={{ p: 1, minHeight: 100 }} />
              </Grid>
            ))}
            {dates.map((date) => {
              const assignment = getAssignmentForDate(date);
              const today = isToday(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <Grid size={{ xs: 12 / 7 }} key={date.toISOString()}>
                  <Card
                    sx={{
                      minHeight: 100,
                      border: today ? '2px solid' : '1px solid',
                      borderColor: today ? 'primary.main' : 'divider',
                      bgcolor: today
                        ? 'primary.lighter'
                        : assignment
                        ? 'white'
                        : isWeekend
                        ? 'grey.100'
                        : 'grey.50',
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: 3 },
                    }}
                  >
                    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography
                          variant="body2"
                          fontWeight={today ? 'bold' : 'medium'}
                          color={isWeekend && !assignment ? 'error.main' : 'text.primary'}
                        >
                          {date.getDate()}
                        </Typography>
                        {today && (
                          <Chip label="Azi" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Stack>

                      {assignment ? (
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            size="small"
                            icon={assignment.shiftType?.isNightShift ? <NightIcon /> : <DayIcon />}
                            label={assignment.shiftType?.name?.substring(0, 8) || 'Tură'}
                            color={assignment.shiftType?.isNightShift ? 'info' : 'warning'}
                            sx={{ fontSize: '0.7rem', height: 22 }}
                          />
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                            {assignment.shiftType?.startTime?.substring(0, 5)}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ mt: 1, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.disabled">
                            Liber
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          // Week View - More detailed
          <Stack spacing={2}>
            {dates.map((date) => {
              const assignment = getAssignmentForDate(date);
              const today = isToday(date);

              return (
                <Paper
                  key={date.toISOString()}
                  elevation={today ? 4 : 1}
                  sx={{
                    p: 2,
                    border: today ? '2px solid' : '1px solid',
                    borderColor: today ? 'primary.main' : 'divider',
                    bgcolor: today ? 'primary.lighter' : 'white',
                  }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid size={{ xs: 3, md: 2 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {dayNamesFull[date.getDay()]}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color={today ? 'primary.main' : 'text.primary'}>
                          {date.getDate()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {monthNames[date.getMonth()]}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 9, md: 10 }}>
                      {assignment ? (
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Avatar
                            sx={{
                              bgcolor: assignment.shiftType?.isNightShift
                                ? 'info.main'
                                : 'warning.main',
                              width: 56,
                              height: 56,
                            }}
                          >
                            {assignment.shiftType?.isNightShift ? (
                              <NightIcon sx={{ fontSize: 28 }} />
                            ) : (
                              <DayIcon sx={{ fontSize: 28 }} />
                            )}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight="medium">
                              {assignment.shiftType?.name}
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Chip
                                icon={<TimeIcon />}
                                label={`${assignment.shiftType?.startTime} - ${assignment.shiftType?.endTime}`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                icon={<HoursIcon />}
                                label={`${assignment.durationHours}h`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={assignment.shiftType?.isNightShift ? 'Noapte' : 'Zi'}
                                size="small"
                                color={assignment.shiftType?.isNightShift ? 'info' : 'warning'}
                              />
                            </Stack>
                          </Box>
                        </Stack>
                      ) : (
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar sx={{ bgcolor: 'grey.200', width: 56, height: 56 }}>
                            <NoShiftIcon sx={{ color: 'grey.500', fontSize: 28 }} />
                          </Avatar>
                          <Typography variant="h6" color="text.secondary">
                            Zi Liberă
                          </Typography>
                        </Stack>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              );
            })}
          </Stack>
        )}

        {/* Legend */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={4} justifyContent="center" flexWrap="wrap">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ width: 24, height: 24, bgcolor: 'warning.main' }}>
                <DayIcon sx={{ fontSize: 14 }} />
              </Avatar>
              <Typography variant="body2">Tură de Zi</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ width: 24, height: 24, bgcolor: 'info.main' }}>
                <NightIcon sx={{ fontSize: 14 }} />
              </Avatar>
              <Typography variant="body2">Tură de Noapte</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.200' }}>
                <NoShiftIcon sx={{ fontSize: 14, color: 'grey.500' }} />
              </Avatar>
              <Typography variant="body2">Zi Liberă</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ width: 24, height: 24, border: '2px solid', borderColor: 'primary.main', borderRadius: 1 }} />
              <Typography variant="body2">Ziua de Azi</Typography>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* Monthly Summary */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
          Detalii Luna {monthNames[currentMonth - 1]} {currentYear}
        </Typography>

        {myAssignments.length > 0 ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <ShiftIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Total Ture Programate"
                    secondary={`${totalShifts} ture`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <HoursIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Total Ore"
                    secondary={`${totalHours} ore`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <DayIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Ture de Zi"
                    secondary={`${dayShifts} ture`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <NightIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Ture de Noapte"
                    secondary={`${nightShifts} ture`}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <NoShiftIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Zile Libere"
                    secondary={`${new Date(currentYear, currentMonth, 0).getDate() - totalShifts} zile`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <TimeIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Medie Ore/Tură"
                    secondary={totalShifts > 0 ? `${(totalHours / totalShifts).toFixed(1)} ore` : 'N/A'}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">
            Nu ai ture programate pentru luna {monthNames[currentMonth - 1]} {currentYear}.
            Contactează managerul pentru detalii.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default MySchedulePage;
