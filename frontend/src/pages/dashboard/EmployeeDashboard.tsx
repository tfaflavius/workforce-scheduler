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
  Fade,
  Grow,
  alpha,
} from '@mui/material';
import {
  Today as TodayIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  WbSunny as DayIcon,
  NightsStay as NightIcon,
  EventBusy as NoShiftIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  AddLocation as AmplasareIcon,
  RemoveCircle as RevocareIcon,
  Brush as MarcajeIcon,
  Badge as LegitimatiiIcon,
  MilitaryTech as RevolutionarIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useGetApprovedLeavesByMonthQuery } from '../../store/api/leaveRequests.api';
import {
  useGetHandicapRequestsQuery,
  useGetHandicapLegitimationsQuery,
  useGetRevolutionarLegitimationsQuery,
} from '../../store/api/handicap.api';
import { useAppSelector } from '../../store/hooks';
import type { WorkSchedule, ScheduleAssignment } from '../../types/schedule.types';

// Departament cu acces la Handicap stats
const HANDICAP_DEPARTMENT_NAME = 'Parcări Handicap';

// StatCard component pentru secțiunea Handicap
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
  delay?: number;
}

const StatCard = ({ title, value, subtitle, icon, color, bgColor, onClick, delay = 0 }: StatCardProps) => {
  const theme = useTheme();

  return (
    <Grow in={true} timeout={500 + delay}>
      <Card
        sx={{
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': onClick ? {
            transform: 'translateY(-4px)',
            boxShadow: theme.palette.mode === 'light'
              ? `0 8px 20px ${alpha(color, 0.2)}`
              : `0 8px 20px ${alpha(color, 0.35)}`,
          } : {},
        }}
        onClick={onClick}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: alpha(color, 0.08),
          }}
        />
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, position: 'relative' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.55rem', sm: '0.65rem' },
                  letterSpacing: '0.5px',
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  color,
                  fontWeight: 800,
                  my: 0.25,
                  fontSize: { xs: '1.5rem', sm: '1.75rem' },
                  lineHeight: 1,
                }}
              >
                {value}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                p: { xs: 1, sm: 1.25 },
                borderRadius: 2,
                bgcolor: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 2px 8px ${alpha(color, 0.2)}`,
              }}
            >
              {icon}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grow>
  );
};

interface ShiftCardProps {
  date: Date;
  assignment?: ScheduleAssignment;
  isToday: boolean;
  isWeekend: boolean;
}

const ShiftCard = ({ date, assignment, isToday, isWeekend }: ShiftCardProps) => {
  const theme = useTheme();
  const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
  const dayOfWeek = dayNames[date.getDay()];

  return (
    <Card
      sx={{
        border: isToday ? '2px solid' : '1px solid',
        borderColor: isToday ? 'primary.main' : theme.palette.divider,
        bgcolor: isToday
          ? alpha(theme.palette.primary.main, 0.08)
          : assignment
            ? theme.palette.background.paper
            : isWeekend
              ? alpha(theme.palette.grey[500], 0.08)
              : alpha(theme.palette.grey[500], 0.04),
        minHeight: { xs: 70, sm: 80, md: 90 },
        transition: 'all 0.2s ease',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: theme.palette.mode === 'light'
            ? '0 4px 12px rgba(0,0,0,0.1)'
            : '0 4px 12px rgba(0,0,0,0.3)',
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      }}
    >
      <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
        <Stack spacing={0.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography
              variant="caption"
              color={isWeekend ? 'error.main' : 'text.secondary'}
              sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, fontWeight: 600 }}
            >
              {dayOfWeek}
            </Typography>
            <Typography
              variant="subtitle2"
              fontWeight="bold"
              color={isWeekend && !assignment ? 'error.main' : 'text.primary'}
              sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
            >
              {date.getDate()}
            </Typography>
          </Stack>
          <Divider />
          {assignment ? (
            <Box sx={{ pt: 0.5 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                {assignment.shiftType?.isNightShift ? (
                  <NightIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'info.main' }} />
                ) : (
                  <DayIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'warning.main' }} />
                )}
                <Typography variant="caption" fontWeight="bold" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                  {assignment.shiftType?.name || 'Tură'}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.55rem', sm: '0.65rem' } }}>
                {assignment.shiftType?.startTime}-{assignment.shiftType?.endTime}
              </Typography>
              {assignment.workPosition && (
                <Box
                  sx={{
                    mt: 0.5,
                    px: 0.75,
                    py: 0.25,
                    bgcolor: assignment.workPosition.color || '#2196F3',
                    borderRadius: 1,
                    display: 'inline-block',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: { xs: '0.5rem', sm: '0.6rem' },
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
            <Box sx={{ py: 0.75, textAlign: 'center' }}>
              <NoShiftIcon sx={{ color: 'text.disabled', fontSize: { xs: 16, sm: 18 } }} />
              <Typography variant="caption" color="text.disabled" display="block" sx={{ fontSize: { xs: '0.55rem', sm: '0.65rem' } }}>
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

  const { data: approvedLeaves = [] } = useGetApprovedLeavesByMonthQuery(monthYear);

  // Check if user is in Parcări Handicap department
  const isHandicapDepartment = user?.department?.name === HANDICAP_DEPARTMENT_NAME;

  // Handicap queries - only fetch if user is in Parcări Handicap department
  const { data: handicapRequests = [] } = useGetHandicapRequestsQuery(undefined, {
    skip: !isHandicapDepartment,
  });
  const { data: handicapLegitimations = [] } = useGetHandicapLegitimationsQuery(undefined, {
    skip: !isHandicapDepartment,
  });
  const { data: revolutionarLegitimations = [] } = useGetRevolutionarLegitimationsQuery(undefined, {
    skip: !isHandicapDepartment,
  });

  const myApprovedLeaveDates = useMemo(() => {
    if (!user) return new Set<string>();
    const dates = new Set<string>();
    approvedLeaves
      .filter(leave => leave.userId === user.id)
      .forEach(leave => {
        leave.dates.forEach(date => dates.add(date));
      });
    return dates;
  }, [approvedLeaves, user]);

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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const existingAssignment = myAssignments.find((a) => {
      const assignmentDate = typeof a.shiftDate === 'string'
        ? a.shiftDate.split('T')[0]
        : new Date(a.shiftDate).toISOString().split('T')[0];
      return assignmentDate === dateStr;
    });

    if (existingAssignment) return existingAssignment;

    if (myApprovedLeaveDates.has(dateStr)) {
      return {
        id: `leave-${dateStr}`,
        workScheduleId: '',
        scheduleId: '',
        userId: user?.id || '',
        shiftTypeId: '',
        shiftDate: dateStr,
        isRestDay: true,
        notes: 'Concediu',
        durationHours: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shiftType: {
          id: '',
          name: 'Concediu',
          startTime: '',
          endTime: '',
          durationHours: 0,
          isNightShift: false,
          shiftPattern: 'SHIFT_12H',
          displayOrder: 99,
          createdAt: '',
          updatedAt: '',
        },
      } as ScheduleAssignment;
    }

    return undefined;
  };

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

  const workingDaysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    return workingDays;
  }, [currentDate]);

  const monthlyHoursNorm = workingDaysInMonth * 8;
  const hoursDifference = totalHoursThisMonth - monthlyHoursNorm;

  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
  ];

  const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
      {/* Header */}
      <Fade in={true} timeout={600}>
        <Box
          sx={{
            mb: { xs: 2.5, sm: 3, md: 4 },
            p: { xs: 2.5, sm: 3, md: 4 },
            borderRadius: { xs: 2, sm: 3 },
            background: todayAssignment
              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: todayAssignment
              ? '0 8px 32px rgba(99, 102, 241, 0.35)'
              : '0 8px 32px rgba(16, 185, 129, 0.35)',
          }}
        >
          {/* Background decorations */}
          <Box
            sx={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -40,
              left: -40,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
            }}
          />

          <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }}>
                <Avatar
                  sx={{
                    width: { xs: 52, sm: 64 },
                    height: { xs: 52, sm: 64 },
                    bgcolor: 'rgba(255,255,255,0.2)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  }}
                >
                  {todayAssignment ? (
                    <TodayIcon sx={{ fontSize: { xs: 26, sm: 32 } }} />
                  ) : (
                    <PersonIcon sx={{ fontSize: { xs: 26, sm: 32 } }} />
                  )}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{
                      opacity: 0.85,
                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                      display: 'block',
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                    }}
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
                        sx={{ fontSize: { xs: '1.15rem', sm: '1.5rem' }, lineHeight: 1.2 }}
                        noWrap
                      >
                        {todayAssignment.shiftType?.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          opacity: 0.9,
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          mt: 0.25,
                        }}
                      >
                        {todayAssignment.shiftType?.startTime} - {todayAssignment.shiftType?.endTime} ({todayAssignment.durationHours}h)
                      </Typography>
                      {todayAssignment.workPosition && (
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
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
                      sx={{ fontSize: { xs: '1.15rem', sm: '1.5rem' } }}
                    >
                      Zi Liberă 🎉
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    opacity: 0.85,
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    fontWeight: 600,
                  }}
                >
                  📊 Sumar {monthNames[currentMonth - 1]} {currentYear}
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 4, sm: 2.4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {totalHoursThisMonth}h
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.55rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Total Ore
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 4, sm: 2.4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {monthlyHoursNorm}h
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.55rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Norma
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 4, sm: 2.4 }}>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                        color: hoursDifference > 0 ? '#fca5a5' : hoursDifference < 0 ? '#fcd34d' : '#86efac',
                      }}
                    >
                      {hoursDifference > 0 ? `+${hoursDifference}` : hoursDifference}h
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.55rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Diferența
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {dayShifts}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.55rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Ture Zi
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {nightShifts}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.55rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Ture Noapte
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Fade>

      {/* Monthly Calendar */}
      <Grow in={true} timeout={800}>
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={2}
            sx={{ mb: 2.5 }}
          >
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
              <IconButton
                onClick={() => navigateMonth('prev')}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
                }}
              >
                <PrevIcon />
              </IconButton>
              <Typography
                variant="subtitle1"
                fontWeight="700"
                sx={{
                  fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' },
                  textAlign: 'center',
                  minWidth: { xs: 140, sm: 200 },
                }}
              >
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Typography>
              <IconButton
                onClick={() => navigateMonth('next')}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
                }}
              >
                <NextIcon />
              </IconButton>
              <Button
                variant="outlined"
                onClick={goToToday}
                size="small"
                sx={{
                  ml: 1,
                  fontWeight: 600,
                  minWidth: 'auto',
                  px: { xs: 1.5, sm: 2 },
                }}
              >
                Azi
              </Button>
            </Stack>
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate('/my-schedule')}
              fullWidth={isMobile}
              sx={{
                minHeight: { xs: 42, sm: 38 },
                fontWeight: 600,
                px: { xs: 2, sm: 3 },
              }}
            >
              📅 Program Complet
            </Button>
          </Stack>

          {/* Day Headers */}
          {!isMobile && (
            <Grid container sx={{ mb: 1.5 }}>
              {dayNames.map((day, index) => (
                <Grid size={{ xs: 12 / 7 }} key={day}>
                  <Typography
                    variant="caption"
                    textAlign="center"
                    color={index === 0 || index === 6 ? 'error.main' : 'text.secondary'}
                    fontWeight="bold"
                    sx={{ display: 'block', fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
                  >
                    {day}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Calendar Grid */}
          {!isMobile ? (
            <Grid container spacing={{ xs: 0.5, sm: 0.75, md: 1 }}>
              {Array.from({ length: monthDates[0]?.getDay() || 0 }).map((_, i) => (
                <Grid size={{ xs: 12 / 7 }} key={`empty-${i}`}>
                  <Box sx={{ minHeight: { xs: 70, sm: 80, md: 90 } }} />
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
                      bgcolor: today
                        ? alpha(theme.palette.primary.main, 0.08)
                        : assignment
                          ? theme.palette.background.paper
                          : alpha(theme.palette.grey[500], 0.04),
                      transition: 'all 0.2s ease',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      '&:active': {
                        transform: 'scale(0.98)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box
                            sx={{
                              minWidth: 44,
                              textAlign: 'center',
                              p: 0.75,
                              borderRadius: 1.5,
                              bgcolor: today
                                ? alpha(theme.palette.primary.main, 0.12)
                                : 'transparent',
                            }}
                          >
                            <Typography
                              variant="caption"
                              color={isWeekend ? 'error.main' : 'text.secondary'}
                              sx={{ display: 'block', fontSize: '0.65rem', fontWeight: 600 }}
                            >
                              {dayNames[date.getDay()]}
                            </Typography>
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              color={isWeekend && !assignment ? 'error.main' : 'text.primary'}
                              sx={{ lineHeight: 1, fontSize: '1.1rem' }}
                            >
                              {date.getDate()}
                            </Typography>
                          </Box>
                          {assignment ? (
                            <Box>
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                {assignment.shiftType?.isNightShift ? (
                                  <NightIcon sx={{ fontSize: 18, color: 'info.main' }} />
                                ) : (
                                  <DayIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                                )}
                                <Typography variant="body2" fontWeight="bold">
                                  {assignment.shiftType?.name || 'Tură'}
                                </Typography>
                                {assignment.workPosition && (
                                  <Box
                                    sx={{
                                      ml: 0.5,
                                      px: 0.75,
                                      py: 0.15,
                                      bgcolor: assignment.workPosition.color || '#2196F3',
                                      borderRadius: 1,
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: '0.65rem',
                                        color: 'white',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {assignment.workPosition.shortName}
                                    </Typography>
                                  </Box>
                                )}
                              </Stack>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {assignment.shiftType?.startTime} - {assignment.shiftType?.endTime}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.disabled" fontWeight="medium">
                              Zi liberă
                            </Typography>
                          )}
                        </Stack>
                        {today && (
                          <Typography
                            variant="caption"
                            color="primary"
                            fontWeight="bold"
                            sx={{
                              px: 1,
                              py: 0.25,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              borderRadius: 1,
                              fontSize: '0.7rem',
                            }}
                          >
                            AZI
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}

          {/* Legend */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={{ xs: 2, sm: 4 }} justifyContent="center" flexWrap="wrap" gap={1}>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <DayIcon sx={{ color: 'warning.main', fontSize: { xs: 18, sm: 22 } }} />
                <Typography variant="caption" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>Zi</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <NightIcon sx={{ color: 'info.main', fontSize: { xs: 18, sm: 22 } }} />
                <Typography variant="caption" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>Noapte</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <NoShiftIcon sx={{ color: 'text.disabled', fontSize: { xs: 18, sm: 22 } }} />
                <Typography variant="caption" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>Liber</Typography>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Grow>

      {/* Secțiune Parcări Handicap - doar pentru departamentul Parcări Handicap */}
      {isHandicapDepartment && (
        <>
          <Fade in={true} timeout={1000}>
            <Box sx={{ mt: { xs: 2.5, sm: 3, md: 4 } }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                  mb: { xs: 1.5, sm: 2 },
                  fontWeight: 700,
                  fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                ♿ Parcări Handicap - Solicitări
              </Typography>
              <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                <Grid size={{ xs: 6, sm: 6, md: 4 }}>
                  <StatCard
                    title="Amplasare Panouri"
                    value={handicapRequests.filter(r => r.requestType === 'AMPLASARE_PANOU').length}
                    subtitle={`${handicapRequests.filter(r => r.requestType === 'AMPLASARE_PANOU' && r.status === 'ACTIVE').length} active`}
                    icon={<AmplasareIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#059669' }} />}
                    color="#059669"
                    bgColor={alpha('#059669', 0.12)}
                    onClick={() => navigate('/parking/handicap')}
                    delay={0}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 6, md: 4 }}>
                  <StatCard
                    title="Revocare Panouri"
                    value={handicapRequests.filter(r => r.requestType === 'REVOCARE_PANOU').length}
                    subtitle={`${handicapRequests.filter(r => r.requestType === 'REVOCARE_PANOU' && r.status === 'ACTIVE').length} active`}
                    icon={<RevocareIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#dc2626' }} />}
                    color="#dc2626"
                    bgColor={alpha('#dc2626', 0.12)}
                    onClick={() => navigate('/parking/handicap')}
                    delay={100}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 6, md: 4 }}>
                  <StatCard
                    title="Creare Marcaje"
                    value={handicapRequests.filter(r => r.requestType === 'CREARE_MARCAJ').length}
                    subtitle={`${handicapRequests.filter(r => r.requestType === 'CREARE_MARCAJ' && r.status === 'ACTIVE').length} active`}
                    icon={<MarcajeIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#0284c7' }} />}
                    color="#0284c7"
                    bgColor={alpha('#0284c7', 0.12)}
                    onClick={() => navigate('/parking/handicap')}
                    delay={200}
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>

          <Divider sx={{ my: { xs: 2, sm: 3 } }} />

          <Fade in={true} timeout={1200}>
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                  mb: { xs: 1.5, sm: 2 },
                  fontWeight: 700,
                  fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                🪪 Legitimații
              </Typography>
              <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                <Grid size={{ xs: 6, sm: 6, md: 6 }}>
                  <StatCard
                    title="Legitimații Handicap"
                    value={handicapLegitimations.length}
                    subtitle={`${handicapLegitimations.filter(l => l.status === 'ACTIVE').length} active`}
                    icon={<LegitimatiiIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#059669' }} />}
                    color="#059669"
                    bgColor={alpha('#059669', 0.12)}
                    onClick={() => navigate('/parking/handicap')}
                    delay={300}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 6, md: 6 }}>
                  <StatCard
                    title="Legitimații Revoluționar"
                    value={revolutionarLegitimations.length}
                    subtitle={`${revolutionarLegitimations.filter(l => l.status === 'ACTIVE').length} active`}
                    icon={<RevolutionarIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#7c3aed' }} />}
                    color="#7c3aed"
                    bgColor={alpha('#7c3aed', 0.12)}
                    onClick={() => navigate('/parking/handicap')}
                    delay={400}
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>
        </>
      )}
    </Box>
  );
};

export default EmployeeDashboard;
