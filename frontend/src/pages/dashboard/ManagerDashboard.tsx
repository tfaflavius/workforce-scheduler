import React, { useMemo, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Alert,
  Button,
  Grow,
  Fade,
  alpha,
  useTheme,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  Groups as GroupsIcon,
  ReportProblem as IssuesIcon,
  LocalAtm as CashIcon,
  Headset as DispatcherIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Security as ControlIcon,
  CalendarMonth as CalendarIcon,
  ArrowForward as ArrowIcon,
  Assessment as ReportIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery, useGetTodayDispatchersQuery } from '../../store/api/schedulesApi';
import { useAppSelector } from '../../store/hooks';
import type { WorkSchedule } from '../../types/schedule.types';
import {
  useGetParkingIssuesQuery,
  useGetUrgentIssuesQuery,
  useGetParkingDamagesQuery,
  useGetUrgentDamagesQuery,
  useGetCashCollectionTotalsQuery,
} from '../../store/api/parking.api';
import { GradientHeader } from '../../components/common/GradientHeader';
import { DashboardSkeleton } from '../../components/common/DashboardSkeleton';
import { useGetCarStatusTodayQuery } from '../../store/api/pvDisplay.api';
import { formatRONCompact } from '../../utils/formatters';

const StatusDistributionChart = React.lazy(() =>
  import('../../components/common/DashboardCharts').then((m) => ({ default: m.StatusDistributionChart })),
);
const WeeklyOverviewChart = React.lazy(() =>
  import('../../components/common/DashboardCharts').then((m) => ({ default: m.WeeklyOverviewChart })),
);

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAppSelector((state) => state.auth);

  const { data: allSchedules, isLoading: schedulesLoading } = useGetSchedulesQuery({});
  const { data: activeIssues = [] } = useGetParkingIssuesQuery('ACTIVE');
  const { data: urgentIssues = [] } = useGetUrgentIssuesQuery();
  const { data: activeDamages = [] } = useGetParkingDamagesQuery('ACTIVE');
  const { data: urgentDamages = [] } = useGetUrgentDamagesQuery();
  const { data: cashTotals } = useGetCashCollectionTotalsQuery({});
  const { data: todayDispatchers = [], isLoading: dispatchersLoading } = useGetTodayDispatchersQuery();
  const { data: carStatus } = useGetCarStatusTodayQuery();

  const { myDrafts, myPending, myApproved, myRejected } = useMemo(() => {
    const mine = (allSchedules || []).filter((s: WorkSchedule) => s.createdBy === user?.id);
    return {
      myDrafts: mine.filter((s) => s.status === 'DRAFT'),
      myPending: mine.filter((s) => s.status === 'PENDING_APPROVAL'),
      myApproved: mine.filter((s) => s.status === 'APPROVED'),
      myRejected: mine.filter((s) => s.status === 'REJECTED'),
    };
  }, [allSchedules, user?.id]);

  const dispatchersDISP = useMemo(() => todayDispatchers.filter(d => d.workPositionCode === 'DISP'), [todayDispatchers]);
  const dispatchersCTRL = useMemo(() => todayDispatchers.filter(d => d.workPositionCode === 'CTRL'), [todayDispatchers]);

  const goToSchedules = useCallback(() => navigate('/schedules'), [navigate]);
  const goToParking = useCallback(() => navigate('/parking'), [navigate]);

  const todayDateStr = useMemo(
    () => new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [],
  );

  if (schedulesLoading || dispatchersLoading) return <DashboardSkeleton />;

  return (
    <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
      <GradientHeader
        title="Dashboard Manager"
        subtitle={todayDateStr}
        icon={<GroupsIcon />}
        gradient="#059669 0%, #0891b2 100%"
      />

      {myRejected.length > 0 && (
        <Fade in={true} timeout={700}>
          <Alert
            severity="error"
            sx={{ mb: { xs: 2, sm: 3 }, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
            action={<Button color="inherit" size="small" onClick={goToSchedules} sx={{ fontWeight: 600 }}>Vezi detalii</Button>}
          >
            <Typography variant="body2" fontWeight="medium">
              Ai {myRejected.length} program(e) respins(e) care necesita atentie!
            </Typography>
          </Alert>
        </Fade>
      )}

      {carStatus?.carInUse && (
        <Fade in={true} timeout={500}>
          <Alert severity="warning" icon={<CarIcon />} sx={{ mb: { xs: 2, sm: 3 }, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>Masina indisponibila — Afisare Procese Verbale</Typography>
            {carStatus.days.map((day) => (
              <Typography key={day.id} variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {day.displayDate} — {[day.controlUser1Name, day.controlUser2Name].filter(Boolean).join(', ')} • Estimativ pana la {day.estimatedReturn}
              </Typography>
            ))}
          </Alert>
        </Fade>
      )}

      {/* Main Content Grid */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Column — Charts */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Row 1: Schedule charts */}
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Suspense fallback={null}>
                <StatusDistributionChart
                  title="Programele Mele"
                  icon={<CalendarIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />}
                  height={{ xs: 180, sm: 220 }}
                  data={[
                    { label: 'Draft', value: myDrafts.length, color: theme.palette.grey[400] },
                    { label: 'In Asteptare', value: myPending.length, color: theme.palette.warning.main },
                    { label: 'Aprobate', value: myApproved.length, color: theme.palette.success.main },
                    { label: 'Respinse', value: myRejected.length, color: theme.palette.error.main },
                  ]}
                />
              </Suspense>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Suspense fallback={null}>
                <WeeklyOverviewChart
                  title="Parcari Etajate"
                  icon={<ReportIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />}
                  height={{ xs: 180, sm: 220 }}
                  data={[
                    { label: 'Probleme', value: activeIssues.length, color: theme.palette.error.main },
                    { label: 'Urgente', value: urgentIssues.length, color: '#f59e0b' },
                    { label: 'Prejudicii', value: activeDamages.length, color: theme.palette.warning.main },
                    { label: 'Urgente Prej.', value: urgentDamages.length, color: theme.palette.secondary.main },
                  ]}
                />
              </Suspense>
            </Grid>
          </Grid>

          {/* Dispatchers Section */}
          {(() => {
            const renderDispatcherList = (dispatchers: typeof todayDispatchers) => (
              <List sx={{ py: 0 }}>
                {dispatchers.map((dispatcher, index) => (
                  <ListItem key={dispatcher.id} sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, mb: index < dispatchers.length - 1 ? 0.75 : 0, px: { xs: 1, sm: 2 }, py: { xs: 0.75, sm: 1 } }}>
                    <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 56 } }}>
                      <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                        <PersonIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="subtitle1" fontWeight="bold" color="white" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }} noWrap>{dispatcher.userName}</Typography>}
                      secondary={
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                          <Chip icon={<TimeIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'white !important' }} />} label={`${dispatcher.startTime} - ${dispatcher.endTime}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, height: { xs: 24, sm: 28 }, fontSize: { xs: '0.7rem', sm: '0.8rem' }, '& .MuiChip-icon': { color: 'white' } }} />
                          <Chip label={dispatcher.shiftCode || dispatcher.shiftType} size="small" sx={{ bgcolor: dispatcher.shiftCode === 'Z' ? 'warning.main' : dispatcher.shiftCode === 'N' ? 'secondary.main' : 'success.main', color: dispatcher.shiftCode === 'Z' ? 'warning.contrastText' : '#fff', fontWeight: 700, height: { xs: 24, sm: 28 }, fontSize: { xs: '0.7rem', sm: '0.8rem' } }} />
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            );

            return (
              <Fade in={true} timeout={650}>
                <Card
                  sx={{
                    background: theme.palette.mode === 'light' ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : 'linear-gradient(135deg, #0369a1 0%, #075985 100%)',
                    color: 'white', position: 'relative', overflow: 'hidden',
                  }}
                >
                  <Box sx={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                  <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, position: 'relative' }}>
                    <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                      <Box sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex' }}>
                        <DispatcherIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>Dispecerat Astazi</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </Typography>
                      </Box>
                    </Stack>
                    {dispatchersDISP.length > 0 ? renderDispatcherList(dispatchersDISP) : (
                      <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 2, textAlign: 'center', mb: dispatchersCTRL.length > 0 ? 2 : 0 }}>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Nu exista personal programat in dispecerat.</Typography>
                      </Box>
                    )}
                    {dispatchersCTRL.length > 0 && (
                      <>
                        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mt: 2.5, mb: { xs: 1.5, sm: 2 } }}>
                          <Box sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex' }}>
                            <ControlIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>Personal Control</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              {`${dispatchersCTRL.length} ${dispatchersCTRL.length === 1 ? 'persoana' : 'persoane'}`}
                            </Typography>
                          </Box>
                        </Stack>
                        {renderDispatcherList(dispatchersCTRL)}
                      </>
                    )}
                  </CardContent>
                </Card>
              </Fade>
            );
          })()}
        </Grid>

        {/* Right Column */}
        <Grid size={{ xs: 12, lg: 4 }}>
          {/* Cash Total Card */}
          <Grow in={true} timeout={600}>
            <Card
              sx={{
                mb: { xs: 2, sm: 3 }, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: theme.palette.mode === 'light' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                color: 'white', position: 'relative', overflow: 'hidden',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 28px rgba(16,185,129,0.35)' },
              }}
              onClick={goToParking}
            >
              <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
              <CardContent sx={{ p: { xs: 2, sm: 2.5 }, position: 'relative' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="overline" sx={{ fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.5px', opacity: 0.9 }}>Total Incasari Automate</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } }}>
                      {cashTotals ? formatRONCompact(cashTotals.totalAmount || 0) : '0 RON'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', opacity: 0.85 }}>
                      {cashTotals ? `${cashTotals.count || 0} ridicari` : 'Nicio ridicare'}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', flexShrink: 0 }}>
                    <CashIcon sx={{ fontSize: 28 }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grow>

          {/* Parking Summary */}
          <Fade in={true} timeout={900}>
            <Card sx={{ mb: { xs: 2, sm: 3 } }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <IssuesIcon sx={{ color: 'error.main', fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                    Parcari - Rezumat
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {[
                    { label: 'Probleme active', value: activeIssues.length, color: theme.palette.error.main, urgent: urgentIssues.length > 0 },
                    { label: 'Prejudicii active', value: activeDamages.length, color: theme.palette.warning.main, urgent: urgentDamages.length > 0 },
                    { label: 'Incasari automate', value: cashTotals?.count || 0, color: theme.palette.success.main, urgent: false },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: 1.5, bgcolor: alpha(item.color, 0.06), borderLeft: `3px solid ${item.color}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>{item.label}</Typography>
                      <Chip label={item.value} size="small" sx={{ fontWeight: 700, bgcolor: item.urgent ? item.color : alpha(item.color, 0.15), color: item.urgent ? 'white' : item.color, height: 24, minWidth: 32, '& .MuiChip-label': { px: 1 } }} />
                    </Stack>
                  ))}
                </Stack>
                <Button fullWidth variant="text" endIcon={<ArrowIcon />} onClick={goToParking} sx={{ mt: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                  Vezi toate parcarile
                </Button>
              </CardContent>
            </Card>
          </Fade>

          {/* Schedule Actions */}
          <Fade in={true} timeout={1000}>
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <CalendarIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                    Actiuni Programe
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {[
                    { label: 'Draft-uri de finalizat', value: myDrafts.length, color: theme.palette.grey[500] },
                    { label: 'Trimise spre aprobare', value: myPending.length, color: theme.palette.warning.main },
                    { label: 'Aprobate active', value: myApproved.length, color: theme.palette.success.main },
                    { label: 'Respinse - de revizuit', value: myRejected.length, color: theme.palette.error.main },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: 1.5, bgcolor: alpha(item.color, 0.06), borderLeft: `3px solid ${item.color}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>{item.label}</Typography>
                      <Chip label={item.value} size="small" sx={{ fontWeight: 700, bgcolor: item.value > 0 && item.color === theme.palette.error.main ? item.color : alpha(item.color, 0.15), color: item.value > 0 && item.color === theme.palette.error.main ? 'white' : item.color, height: 24, minWidth: 32, '& .MuiChip-label': { px: 1 } }} />
                    </Stack>
                  ))}
                </Stack>
                <Button fullWidth variant="text" endIcon={<ArrowIcon />} onClick={goToSchedules} sx={{ mt: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                  Gestioneaza programe
                </Button>
              </CardContent>
            </Card>
          </Fade>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ManagerDashboard;
