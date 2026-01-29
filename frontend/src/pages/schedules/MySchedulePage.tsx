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
  useMediaQuery,
  useTheme,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
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
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{
        mb: { xs: 2, sm: 3, md: 4 },
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
            sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' } }}
          >
            Programul Meu de Lucru
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Vizualizează programul tău zilnic și lunar
          </Typography>
        </Box>
        {!isMobile && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<PrintIcon />} disabled size="small">
              Printează
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} disabled size="small">
              Exportă
            </Button>
          </Stack>
        )}
      </Box>

      {/* Today's Shift Card */}
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
            <Stack direction="row" alignItems="center" spacing={{ xs: 2, sm: 3 }}>
              <Avatar
                sx={{
                  width: { xs: 56, sm: 80 },
                  height: { xs: 56, sm: 80 },
                  bgcolor: 'rgba(255,255,255,0.2)',
                }}
              >
                <TodayIcon sx={{ fontSize: { xs: 28, sm: 40 } }} />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="overline"
                  sx={{
                    opacity: 0.8,
                    letterSpacing: 1,
                    fontSize: { xs: '0.6rem', sm: '0.75rem' },
                    display: 'block'
                  }}
                >
                  Azi, {new Date().toLocaleDateString('ro-RO', {
                    weekday: isMobile ? 'short' : 'long',
                    day: 'numeric',
                    month: isMobile ? 'short' : 'long',
                  })}
                </Typography>
                {todayAssignment ? (
                  <>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      sx={{ my: 0.5, fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}
                      noWrap
                    >
                      {todayAssignment.shiftType?.name}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                      <Chip
                        icon={todayAssignment.shiftType?.isNightShift ? <NightIcon /> : <DayIcon />}
                        label={todayAssignment.shiftType?.isNightShift ? 'Noapte' : 'Zi'}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                      />
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {todayAssignment.shiftType?.startTime} - {todayAssignment.shiftType?.endTime}
                      </Typography>
                    </Stack>
                  </>
                ) : (
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    sx={{ my: 0.5, fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}
                  >
                    Zi Liberă
                  </Typography>
                )}
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'rgba(255,255,255,0.1)' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, opacity: 0.8, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                Sumar Luna {monthNames[currentMonth - 1]}
              </Typography>
              <Grid container spacing={{ xs: 1, sm: 2 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{totalHours}h</Typography>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>Total Ore</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{totalShifts}</Typography>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>Total Ture</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{dayShifts}</Typography>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>Ture Zi</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{nightShifts}</Typography>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>Ture Noapte</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Calendar View */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Calendar Controls */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
          sx={{ mb: { xs: 2, sm: 3 } }}
        >
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={{ xs: 1, sm: 2 }}>
            <IconButton onClick={() => navigatePeriod('prev')} size={isMobile ? 'small' : 'medium'}>
              <PrevIcon />
            </IconButton>
            <Typography
              variant="subtitle1"
              fontWeight="600"
              sx={{
                minWidth: { xs: 'auto', sm: 250 },
                textAlign: 'center',
                fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
              }}
            >
              {viewMode === 'week'
                ? `${dates[0]?.getDate()} - ${dates[6]?.getDate()} ${monthNames[dates[0]?.getMonth()]?.substring(0, 3)}`
                : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            </Typography>
            <IconButton onClick={() => navigatePeriod('next')} size={isMobile ? 'small' : 'medium'}>
              <NextIcon />
            </IconButton>
            <Button variant="text" onClick={goToToday} size="small">
              Azi
            </Button>
          </Stack>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => value && setViewMode(value)}
            size="small"
            sx={{ alignSelf: { xs: 'center', sm: 'auto' } }}
          >
            <ToggleButton value="week" sx={{ px: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Săptămânal
            </ToggleButton>
            <ToggleButton value="month" sx={{ px: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Lunar
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Week Day Headers (for month view) */}
        {viewMode === 'month' && !isMobile && (
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
        {viewMode === 'month' && !isMobile ? (
          <Grid container spacing={0.5}>
            {/* Empty cells for first week alignment */}
            {Array.from({ length: (dates[0]?.getDay() + 6) % 7 }).map((_, i) => (
              <Grid size={{ xs: 12 / 7 }} key={`empty-${i}`}>
                <Box sx={{ p: 0.5, minHeight: { xs: 60, sm: 80, md: 100 } }} />
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
                      minHeight: { xs: 60, sm: 80, md: 100 },
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
                      '&:hover': { boxShadow: 2 },
                    }}
                  >
                    <CardContent sx={{ p: { xs: 0.5, sm: 1 }, '&:last-child': { pb: { xs: 0.5, sm: 1 } } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography
                          variant="body2"
                          fontWeight={today ? 'bold' : 'medium'}
                          color={isWeekend && !assignment ? 'error.main' : 'text.primary'}
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                        >
                          {date.getDate()}
                        </Typography>
                        {today && !isTablet && (
                          <Chip label="Azi" size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem' }} />
                        )}
                      </Stack>

                      {assignment ? (
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            icon={isTablet ? undefined : (assignment.shiftType?.isNightShift ? <NightIcon /> : <DayIcon />)}
                            label={assignment.shiftType?.name?.substring(0, isTablet ? 4 : 8) || 'T'}
                            color={assignment.shiftType?.isNightShift ? 'info' : 'warning'}
                            sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 18, sm: 22 } }}
                          />
                          {!isTablet && (
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.65rem' }}>
                              {assignment.shiftType?.startTime?.substring(0, 5)}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ mt: 0.5, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                            -
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : viewMode === 'month' && isMobile ? (
          // Mobile: List view for month
          <Stack spacing={1}>
            {dates.map((date) => {
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
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
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
                            <Typography variant="body2" fontWeight="medium">
                              {assignment.shiftType?.name}
                            </Typography>
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
                      {assignment && (
                        <Chip
                          size="small"
                          label={assignment.shiftType?.isNightShift ? 'Noapte' : 'Zi'}
                          color={assignment.shiftType?.isNightShift ? 'info' : 'warning'}
                        />
                      )}
                      {today && (
                        <Chip label="Azi" size="small" color="primary" />
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
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
        <Box sx={{ mt: { xs: 2, sm: 3 }, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack
            direction="row"
            spacing={{ xs: 2, sm: 4 }}
            justifyContent="center"
            flexWrap="wrap"
            sx={{ gap: { xs: 1, sm: 0 } }}
          >
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Avatar sx={{ width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, bgcolor: 'warning.main' }}>
                <DayIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />
              </Avatar>
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Zi</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Avatar sx={{ width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, bgcolor: 'info.main' }}>
                <NightIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />
              </Avatar>
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Noapte</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Avatar sx={{ width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, bgcolor: 'grey.200' }}>
                <NoShiftIcon sx={{ fontSize: { xs: 12, sm: 14 }, color: 'grey.500' }} />
              </Avatar>
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Liber</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, border: '2px solid', borderColor: 'primary.main', borderRadius: 1 }} />
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Azi</Typography>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* Monthly Summary */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mt: { xs: 2, sm: 3 } }}>
        <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}>
          Detalii Luna {monthNames[currentMonth - 1]} {currentYear}
        </Typography>

        {myAssignments.length > 0 ? (
          <Grid container spacing={{ xs: 1, sm: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <List dense sx={{ py: 0 }}>
                <ListItem sx={{ py: { xs: 0.5, sm: 1 } }}>
                  <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 } }}>
                    <ShiftIcon color="primary" fontSize={isMobile ? 'small' : 'medium'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Total Ture"
                    secondary={`${totalShifts} ture`}
                    primaryTypographyProps={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    secondaryTypographyProps={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  />
                </ListItem>
                <ListItem sx={{ py: { xs: 0.5, sm: 1 } }}>
                  <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 } }}>
                    <HoursIcon color="primary" fontSize={isMobile ? 'small' : 'medium'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Total Ore"
                    secondary={`${totalHours} ore`}
                    primaryTypographyProps={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    secondaryTypographyProps={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  />
                </ListItem>
                <ListItem sx={{ py: { xs: 0.5, sm: 1 } }}>
                  <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 } }}>
                    <DayIcon color="warning" fontSize={isMobile ? 'small' : 'medium'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Ture de Zi"
                    secondary={`${dayShifts} ture`}
                    primaryTypographyProps={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    secondaryTypographyProps={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <List dense sx={{ py: 0 }}>
                <ListItem sx={{ py: { xs: 0.5, sm: 1 } }}>
                  <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 } }}>
                    <NightIcon color="info" fontSize={isMobile ? 'small' : 'medium'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Ture de Noapte"
                    secondary={`${nightShifts} ture`}
                    primaryTypographyProps={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    secondaryTypographyProps={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  />
                </ListItem>
                <ListItem sx={{ py: { xs: 0.5, sm: 1 } }}>
                  <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 } }}>
                    <NoShiftIcon color="action" fontSize={isMobile ? 'small' : 'medium'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Zile Libere"
                    secondary={`${new Date(currentYear, currentMonth, 0).getDate() - totalShifts} zile`}
                    primaryTypographyProps={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    secondaryTypographyProps={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  />
                </ListItem>
                <ListItem sx={{ py: { xs: 0.5, sm: 1 } }}>
                  <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 } }}>
                    <TimeIcon color="action" fontSize={isMobile ? 'small' : 'medium'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Medie Ore/Tură"
                    secondary={totalShifts > 0 ? `${(totalHours / totalShifts).toFixed(1)} ore` : 'N/A'}
                    primaryTypographyProps={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    secondaryTypographyProps={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Nu ai ture programate pentru luna {monthNames[currentMonth - 1]} {currentYear}.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default MySchedulePage;
