import { useMemo } from 'react';
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
  Divider,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  useMediaQuery,
  useTheme,
  Fade,
  Grow,
  alpha,
} from '@mui/material';
import {
  Today as TodayIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  AddLocation as AmplasareIcon,
  RemoveCircle as RevocareIcon,
  Brush as MarcajeIcon,
  Badge as LegitimatiiIcon,
  MilitaryTech as RevolutionarIcon,
  Headset as DispatcherIcon,
  Security as ControlIcon,
  AccessTime as TimeIcon,
  EventNote as TomorrowIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery, useGetShiftColleaguesQuery } from '../../store/api/schedulesApi';
import { useGetApprovedLeavesByMonthQuery } from '../../store/api/leaveRequests.api';
import {
  useGetHandicapRequestsQuery,
  useGetHandicapLegitimationsQuery,
  useGetRevolutionarLegitimationsQuery,
} from '../../store/api/handicap.api';
import { useAppSelector } from '../../store/hooks';
import type { WorkSchedule, ScheduleAssignment } from '../../types/schedule.types';

// Departament cu acces la Handicap stats
const HANDICAP_DEPARTMENT_NAME = 'Parcari Handicap';

// StatCard component pentru sectiunea Handicap
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


const EmployeeDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const currentDate = new Date();

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const monthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const { data: schedules, isLoading } = useGetSchedulesQuery({
    monthYear,
    status: 'APPROVED',
  });

  const { data: approvedLeaves = [] } = useGetApprovedLeavesByMonthQuery(monthYear);

  // Check if user is in Dispecerat or Control department
  const isDispatchDepartment = user?.department?.name === 'Dispecerat' || user?.department?.name === 'Control';

  // Get colleagues on same position (only for Dispecerat/Control)
  const { data: colleaguesData } = useGetShiftColleaguesQuery(undefined, {
    skip: !isDispatchDepartment,
  });

  // Check if user is in Parcari Handicap department
  const isHandicapDepartment = user?.department?.name === HANDICAP_DEPARTMENT_NAME;

  // Handicap queries - only fetch if user is in Parcari Handicap department
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

  // Departamente cu dashboard simplu
  const SIMPLE_DEPARTMENTS = ['Procese Verbale/Facturare', 'Parcometre', 'Achizitii'];
  const isSimpleDepartment = SIMPLE_DEPARTMENTS.includes(user?.department?.name || '');

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  // Dashboard simplu pentru departamentele noi
  if (isSimpleDepartment) {
    const todayStr = `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    return (
      <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
        <Fade in={true} timeout={600}>
          <Box
            sx={{
              mb: { xs: 2.5, sm: 3, md: 4 },
              p: { xs: 2.5, sm: 3, md: 4 },
              borderRadius: { xs: 2, sm: 3 },
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.35)',
            }}
          >
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
            <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, mb: 0.5 }}>
              Buna, {user?.fullName?.split(' ')[0]}!
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {todayStr} — {user?.department?.name}
            </Typography>
          </Box>
        </Fade>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Grow in={true} timeout={700}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 20px ${alpha('#3b82f6', 0.2)}` },
                }}
                onClick={() => navigate('/my-schedule')}
              >
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <TodayIcon sx={{ fontSize: 36, color: '#3b82f6', mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Programul Meu
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {todayAssignment
                      ? `Astazi: ${todayAssignment.shiftType?.name || 'Program'}`
                      : 'Niciun program astazi'}
                  </Typography>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Grow in={true} timeout={900}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 20px ${alpha('#10b981', 0.2)}` },
                }}
                onClick={() => navigate('/leave-requests')}
              >
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <TimeIcon sx={{ fontSize: 36, color: '#10b981', mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Concedii
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Gestioneaza cererile de concediu
                  </Typography>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Grow in={true} timeout={1100}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 20px ${alpha('#8b5cf6', 0.2)}` },
                }}
                onClick={() => navigate('/daily-reports')}
              >
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <TomorrowIcon sx={{ fontSize: 36, color: '#8b5cf6', mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Raport Zilnic
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Scrie raportul de astazi
                  </Typography>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        </Grid>
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
                      Zi Libera 🎉
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
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Total Ore
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 4, sm: 2.4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {monthlyHoursNorm}h
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, opacity: 0.85 }}>
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
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Diferenta
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {dayShifts}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Ture Zi
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {nightShifts}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, opacity: 0.85 }}>
                      Ture Noapte
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Fade>

      {/* Colleagues on Shift - for Dispecerat/Control departments */}
      {isDispatchDepartment && colleaguesData?.userPosition && (
        <Fade in={true} timeout={700}>
          <Box sx={{ mb: { xs: 2, sm: 3 } }}>
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
              {colleaguesData.userPosition === 'DISP' ? '🎧' : '🛡️'}{' '}
              Colegi pe tura - {colleaguesData.userPosition === 'DISP' ? 'Dispecerat' : 'Control'}
            </Typography>
            <Card
              sx={{
                background: theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                  : 'linear-gradient(135deg, #0369a1 0%, #075985 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              />
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, position: 'relative' }}>
                {/* Today */}
                <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                  <Box
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                    }}
                  >
                    {colleaguesData.userPosition === 'DISP'
                      ? <DispatcherIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
                      : <ControlIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                      Astazi - {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {colleaguesData.today.length > 0
                        ? `${colleaguesData.today.length} ${colleaguesData.today.length === 1 ? 'persoana' : 'persoane'} pe tura`
                        : 'Nimeni programat'}
                    </Typography>
                  </Box>
                </Stack>

                {colleaguesData.today.length > 0 ? (
                  <List sx={{ py: 0 }}>
                    {colleaguesData.today.map((colleague, index) => (
                      <ListItem
                        key={colleague.id}
                        sx={{
                          bgcolor: colleague.isCurrentUser ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          mb: index < colleaguesData.today.length - 1 ? 0.75 : 0,
                          px: { xs: 1, sm: 2 },
                          py: { xs: 0.75, sm: 1 },
                          border: colleague.isCurrentUser ? '1px solid rgba(255,255,255,0.4)' : 'none',
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 56 } }}>
                          <Avatar
                            sx={{
                              bgcolor: colleague.isCurrentUser ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)',
                              color: 'white',
                              width: { xs: 32, sm: 40 },
                              height: { xs: 32, sm: 40 },
                            }}
                          >
                            <PersonIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography
                                variant="subtitle1"
                                fontWeight="bold"
                                color="white"
                                sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}
                                noWrap
                              >
                                {colleague.userName}
                              </Typography>
                              {colleague.isCurrentUser && (
                                <Chip
                                  label="Tu"
                                  size="small"
                                  sx={{
                                    bgcolor: 'rgba(255,255,255,0.3)',
                                    color: 'white',
                                    fontWeight: 700,
                                    height: 20,
                                    fontSize: '0.65rem',
                                  }}
                                />
                              )}
                            </Stack>
                          }
                          secondary={
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                              <Chip
                                icon={<TimeIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'white !important' }} />}
                                label={`${colleague.startTime} - ${colleague.endTime}`}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(255,255,255,0.2)',
                                  color: 'white',
                                  fontWeight: 600,
                                  height: { xs: 24, sm: 28 },
                                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                                  '& .MuiChip-icon': { color: 'white' },
                                  '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                                }}
                              />
                              <Chip
                                label={colleague.shiftCode || colleague.shiftType}
                                size="small"
                                sx={{
                                  bgcolor: colleague.shiftCode === 'Z' ? '#fbbf24' : colleague.shiftCode === 'N' ? '#8b5cf6' : '#10b981',
                                  color: colleague.shiftCode === 'Z' ? '#000' : '#fff',
                                  fontWeight: 700,
                                  height: { xs: 24, sm: 28 },
                                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                                  '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                                }}
                              />
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Nu exista colegi programati astazi.
                    </Typography>
                  </Box>
                )}

                {/* Tomorrow */}
                <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mt: 2.5, mb: { xs: 1.5, sm: 2 } }}>
                  <Box
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      display: 'flex',
                    }}
                  >
                    <TomorrowIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                      Maine - {(() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return tomorrow.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
                      })()}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {colleaguesData.tomorrow.length > 0
                        ? `${colleaguesData.tomorrow.length} ${colleaguesData.tomorrow.length === 1 ? 'persoana' : 'persoane'} pe tura`
                        : 'Nimeni programat'}
                    </Typography>
                  </Box>
                </Stack>

                {colleaguesData.tomorrow.length > 0 ? (
                  <List sx={{ py: 0 }}>
                    {colleaguesData.tomorrow.map((colleague, index) => (
                      <ListItem
                        key={colleague.id}
                        sx={{
                          bgcolor: colleague.isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                          borderRadius: 2,
                          mb: index < colleaguesData.tomorrow.length - 1 ? 0.75 : 0,
                          px: { xs: 1, sm: 2 },
                          py: { xs: 0.75, sm: 1 },
                          border: colleague.isCurrentUser ? '1px solid rgba(255,255,255,0.3)' : 'none',
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 56 } }}>
                          <Avatar
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.2)',
                              color: 'white',
                              width: { xs: 32, sm: 40 },
                              height: { xs: 32, sm: 40 },
                            }}
                          >
                            <PersonIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography
                                variant="subtitle1"
                                fontWeight="bold"
                                color="white"
                                sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}
                                noWrap
                              >
                                {colleague.userName}
                              </Typography>
                              {colleague.isCurrentUser && (
                                <Chip
                                  label="Tu"
                                  size="small"
                                  sx={{
                                    bgcolor: 'rgba(255,255,255,0.3)',
                                    color: 'white',
                                    fontWeight: 700,
                                    height: 20,
                                    fontSize: '0.65rem',
                                  }}
                                />
                              )}
                            </Stack>
                          }
                          secondary={
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                              <Chip
                                icon={<TimeIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'white !important' }} />}
                                label={`${colleague.startTime} - ${colleague.endTime}`}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(255,255,255,0.2)',
                                  color: 'white',
                                  fontWeight: 600,
                                  height: { xs: 24, sm: 28 },
                                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                                  '& .MuiChip-icon': { color: 'white' },
                                  '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                                }}
                              />
                              <Chip
                                label={colleague.shiftCode || colleague.shiftType}
                                size="small"
                                sx={{
                                  bgcolor: colleague.shiftCode === 'Z' ? '#fbbf24' : colleague.shiftCode === 'N' ? '#8b5cf6' : '#10b981',
                                  color: colleague.shiftCode === 'Z' ? '#000' : '#fff',
                                  fontWeight: 700,
                                  height: { xs: 24, sm: 28 },
                                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                                  '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                                }}
                              />
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2, p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Nu exista colegi programati maine.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Fade>
      )}


      {/* Sectiune Parcari Handicap - doar pentru departamentul Parcari Handicap */}
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
                ♿ Parcari Handicap - Solicitari
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
                🪪 Legitimatii
              </Typography>
              <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                <Grid size={{ xs: 6, sm: 6, md: 6 }}>
                  <StatCard
                    title="Legitimatii Handicap"
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
                    title="Legitimatii Revolutionar"
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
