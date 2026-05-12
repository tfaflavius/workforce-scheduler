import React, { useMemo, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRONCompact } from '../../utils/formatters';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Fade,
  Grow,
  alpha,
  useTheme,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  Alert,
} from '@mui/material';
import {
  PendingActions as PendingIcon,
  CalendarMonth as CalendarIcon,
  SwapHoriz as SwapIcon,
  BeachAccess as BeachIcon,
  TrendingUp as TrendingIcon,
  ReportProblem as IssuesIcon,
  LocalAtm as CashIcon,
  Edit as EditIcon,
  Headset as DispatcherIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Security as ControlIcon,
  Notifications as NotifIcon,
  ArrowForward as ArrowIcon,
  DirectionsCar as CarIcon,
  Accessible as AccessibleIcon,
  Assessment as ReportIcon,
  AccountBalance as AccountBalanceIcon,
  Home as HomeIcon,
  Gavel as GavelIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useGetDashboardStatsQuery } from '../../store/api/dashboard.api';
import { GradientHeader } from '../../components/common/GradientHeader';
import { DashboardSkeleton } from '../../components/common/DashboardSkeleton';
import { getTimeAgo } from '../../utils/getTimeAgo';
import { useSmartPolling } from '../../hooks/useSmartPolling';

const StatusDistributionChart = React.lazy(() =>
  import('../../components/common/DashboardCharts').then((m) => ({ default: m.StatusDistributionChart })),
);
const WeeklyOverviewChart = React.lazy(() =>
  import('../../components/common/DashboardCharts').then((m) => ({ default: m.WeeklyOverviewChart })),
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const goToParking = useCallback(() => navigate('/parking'), [navigate]);
  const goToSchedulesPending = useCallback(() => navigate('/schedules/pending'), [navigate]);
  const goToAdminShiftSwaps = useCallback(() => navigate('/admin/shift-swaps'), [navigate]);
  const goToAdminLeaveRequests = useCallback(() => navigate('/admin/leave-requests'), [navigate]);
  const goToAdminEditRequests = useCallback(() => navigate('/admin/edit-requests'), [navigate]);

  const adminPollingInterval = useSmartPolling(60000);
  const { data: stats, isLoading, isError } = useGetDashboardStatsQuery(undefined, {
    pollingInterval: adminPollingInterval,
  });

  const hasError = isError || (!isLoading && !stats);

  const pendingCount = stats?.schedules?.pending || 0;
  const pendingSwaps = stats?.shiftSwaps?.pendingAdmin || 0;
  const pendingLeaves = stats?.leaveRequests?.pending || 0;
  const todayDispatchers = stats?.todayDispatchers || [];
  const recentNotifications = stats?.recentNotifications || [];
  const carStatus = stats?.carStatus;

  const dispatchersDISP = useMemo(() => todayDispatchers.filter(d => d.workPositionCode === 'DISP'), [todayDispatchers]);
  const dispatchersCTRL = useMemo(() => todayDispatchers.filter(d => d.workPositionCode === 'CTRL'), [todayDispatchers]);

  const pendingActions = useMemo(() => [
    { label: 'Programe', count: pendingCount, icon: <CalendarIcon sx={{ fontSize: 16 }} />, color: theme.palette.warning.main, onClick: goToSchedulesPending },
    { label: 'Schimburi', count: pendingSwaps, icon: <SwapIcon sx={{ fontSize: 16 }} />, color: theme.palette.info.main, onClick: goToAdminShiftSwaps },
    { label: 'Concedii', count: pendingLeaves, icon: <BeachIcon sx={{ fontSize: 16 }} />, color: theme.palette.secondary.main, onClick: goToAdminLeaveRequests },
    { label: 'Editari', count: stats?.parking?.pendingEditRequests || 0, icon: <EditIcon sx={{ fontSize: 16 }} />, color: theme.palette.primary.main, onClick: goToAdminEditRequests },
  ].filter(a => a.count > 0), [pendingCount, pendingSwaps, pendingLeaves, stats?.parking?.pendingEditRequests, theme.palette, goToSchedulesPending, goToAdminShiftSwaps, goToAdminLeaveRequests, goToAdminEditRequests]);

  if (isLoading) return <DashboardSkeleton />;

  if (hasError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Nu s-au putut incarca datele dashboard-ului. Verifica conexiunea la internet si reincearca.
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Reincearca
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
      <GradientHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        icon={<TrendingIcon />}
        gradient="#0f172a 0%, #1e293b 100%"
      />

      {/* PV Car Status Banner */}
      {carStatus?.carInUse && (
        <Fade in={true} timeout={500}>
          <Alert
            severity="warning"
            icon={<CarIcon />}
            sx={{ mb: { xs: 2, sm: 3 }, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
          >
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
              Masina indisponibila — Afisare Procese Verbale
            </Typography>
            {carStatus.days.map((day) => (
              <Typography key={day.id} variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {day.displayDate} — {[day.controlUser1Name, day.controlUser2Name].filter(Boolean).join(', ')} • Estimativ pana la {day.estimatedReturn}
              </Typography>
            ))}
          </Alert>
        </Fade>
      )}

      {/* Pending Actions Strip */}
      {pendingActions.length > 0 && (
        <Fade in={true} timeout={500}>
          <Card
            sx={{
              mb: { xs: 2, sm: 3 },
              border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
              bgcolor: alpha(theme.palette.warning.main, 0.04),
            }}
          >
            <CardContent sx={{ py: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <PendingIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'warning.main' }}>
                  Necesita atentie
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {pendingActions.map((action) => (
                  <Chip
                    key={action.label}
                    icon={action.icon}
                    label={`${action.label}: ${action.count}`}
                    onClick={action.onClick}
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '0.75rem', sm: '0.8rem' },
                      height: { xs: 32, sm: 36 },
                      bgcolor: alpha(action.color, 0.1),
                      color: action.color,
                      border: `1px solid ${alpha(action.color, 0.3)}`,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: alpha(action.color, 0.2) },
                      '& .MuiChip-icon': { color: action.color },
                    }}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Fade>
      )}

      {/* Main Content Grid */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Column — Charts + Dispatchers */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Row 1: Two Doughnut Charts */}
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Suspense fallback={null}>
                <StatusDistributionChart
                  title="Programe"
                  icon={<CalendarIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />}
                  height={{ xs: 180, sm: 220 }}
                  data={[
                    { label: 'In Asteptare', value: pendingCount, color: theme.palette.warning.main },
                    { label: 'Aprobate', value: stats?.schedules.approved || 0, color: theme.palette.success.main },
                    { label: 'Respinse', value: stats?.schedules.rejected || 0, color: theme.palette.error.main },
                    { label: 'Draft', value: stats?.schedules.draft || 0, color: theme.palette.grey[400] },
                  ]}
                />
              </Suspense>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Suspense fallback={null}>
                <StatusDistributionChart
                  title="Cereri Active"
                  icon={<IssuesIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />}
                  height={{ xs: 180, sm: 220 }}
                  data={[
                    { label: 'Probleme Parcari', value: stats?.parking?.activeIssues || 0, color: theme.palette.error.main },
                    { label: 'Prejudicii', value: stats?.parking?.activeDamages || 0, color: theme.palette.warning.main },
                    { label: 'Schimburi Ture', value: stats?.shiftSwaps?.total || 0, color: theme.palette.info.main },
                    { label: 'Concedii', value: stats?.leaveRequests?.total || 0, color: theme.palette.secondary.main },
                    { label: 'Cereri Editare', value: stats?.parking?.pendingEditRequests || 0, color: theme.palette.primary.main },
                  ]}
                />
              </Suspense>
            </Grid>
          </Grid>

          {/* Row 2: Bar Chart — Overview */}
          <Box sx={{ mb: { xs: 2, sm: 3 } }}>
            <Suspense fallback={null}>
              <WeeklyOverviewChart
                title="Sumar General"
                icon={<ReportIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />}
                height={{ xs: 180, sm: 220 }}
                data={[
                  { label: 'Utilizatori', value: stats?.activeUsersCount || 0, color: theme.palette.primary.main },
                  { label: 'Programe', value: (stats?.schedules.pending || 0) + (stats?.schedules.approved || 0), color: theme.palette.warning.main },
                  { label: 'Schimburi', value: stats?.shiftSwaps?.total || 0, color: theme.palette.info.main },
                  { label: 'Concedii', value: stats?.leaveRequests?.total || 0, color: theme.palette.secondary.main },
                  { label: 'Probleme', value: stats?.parking?.activeIssues || 0, color: theme.palette.error.main },
                  { label: 'Prejudicii', value: stats?.parking?.activeDamages || 0, color: '#f59e0b' },
                ]}
              />
            </Suspense>
          </Box>

          {/* Row 3: Incasari/Cheltuieli + Control Sesizari */}
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Suspense fallback={null}>
                <WeeklyOverviewChart
                  title={`Incasari / Cheltuieli — ${stats?.revenue?.month || ''}/${stats?.revenue?.year || ''}`}
                  icon={<AccountBalanceIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />}
                  height={{ xs: 160, sm: 200 }}
                  data={[
                    { label: 'Incasari', value: stats?.revenue?.incasari || 0, color: theme.palette.success.main },
                    { label: 'Incasari Card', value: stats?.revenue?.incasariCard || 0, color: theme.palette.info.main },
                    { label: 'Cheltuieli', value: stats?.revenue?.cheltuieli || 0, color: theme.palette.error.main },
                  ]}
                />
              </Suspense>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Suspense fallback={null}>
                <StatusDistributionChart
                  title="Control Sesizari"
                  icon={<GavelIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />}
                  height={{ xs: 160, sm: 200 }}
                  data={[
                    { label: 'Zona Rosu', value: stats?.controlSesizari?.byZone?.rosu || 0, color: theme.palette.error.main },
                    { label: 'Zona Galben', value: stats?.controlSesizari?.byZone?.galben || 0, color: '#f59e0b' },
                    { label: 'Zona Alb', value: stats?.controlSesizari?.byZone?.alb || 0, color: theme.palette.grey[500] },
                    { label: 'Finalizate', value: stats?.controlSesizari?.finalizat || 0, color: theme.palette.success.main },
                  ]}
                />
              </Suspense>
            </Grid>
          </Grid>

          {/* Row 4: Domiciliu + Achizitii */}
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Suspense fallback={null}>
                <StatusDistributionChart
                  title="Parcari Domiciliu"
                  icon={<HomeIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />}
                  height={{ xs: 160, sm: 200 }}
                  data={[
                    { label: 'Trasare Locuri', value: stats?.domiciliu?.byType?.trasareLocuri || 0, color: theme.palette.primary.main },
                    { label: 'Revocare Locuri', value: stats?.domiciliu?.byType?.revocareLocuri || 0, color: theme.palette.error.main },
                    { label: 'Amplasare Panou', value: stats?.domiciliu?.byType?.amplasarePanou || 0, color: theme.palette.success.main },
                    { label: 'Revocare Panou', value: stats?.domiciliu?.byType?.revocarePanou || 0, color: theme.palette.secondary.main },
                    { label: 'Finalizate', value: stats?.domiciliu?.finalizat || 0, color: theme.palette.grey[400] },
                  ]}
                />
              </Suspense>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Suspense fallback={null}>
                <WeeklyOverviewChart
                  title={`Achizitii ${new Date().getFullYear()}`}
                  icon={<ShoppingCartIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />}
                  height={{ xs: 160, sm: 200 }}
                  data={[
                    { label: 'Investitii', value: stats?.achizitii?.investments || 0, color: theme.palette.primary.main },
                    { label: 'Cheltuieli Curente', value: stats?.achizitii?.currentExpenses || 0, color: theme.palette.warning.main },
                    { label: 'Total Cheltuit', value: stats?.achizitii?.totalSpent || 0, color: theme.palette.error.main },
                  ]}
                />
              </Suspense>
            </Grid>
          </Grid>

          {/* Today's Dispatchers */}
          {(() => {
            const renderDispatcherList = (dispatchers: typeof todayDispatchers) => (
              <List sx={{ py: 0 }}>
                {dispatchers.map((dispatcher, index) => (
                  <ListItem
                    key={dispatcher.id}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.1)',
                      borderRadius: 2,
                      mb: index < dispatchers.length - 1 ? 0.75 : 0,
                      px: { xs: 1, sm: 2 },
                      py: { xs: 0.75, sm: 1 },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 56 } }}>
                      <Avatar
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.25)',
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
                        <Typography variant="subtitle1" fontWeight="bold" color="white" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }} noWrap>
                          {dispatcher.userName}
                        </Typography>
                      }
                      secondary={
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                          <Chip
                            icon={<TimeIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'white !important' }} />}
                            label={`${dispatcher.startTime} - ${dispatcher.endTime}`}
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
                            label={dispatcher.shiftCode || dispatcher.shiftType}
                            size="small"
                            sx={{
                              bgcolor: dispatcher.shiftCode === 'Z' ? theme.palette.warning.light : dispatcher.shiftCode === 'N' ? theme.palette.secondary.main : theme.palette.success.main,
                              color: dispatcher.shiftCode === 'Z' ? '#000' : '#fff',
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
            );

            return (
              <Fade in={true} timeout={650}>
                <Card
                  sx={{
                    background: theme.palette.mode === 'light'
                      ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
                      : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
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
                    <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                      <Box sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex' }}>
                        <DispatcherIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                          Dispecerat Astazi
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </Typography>
                      </Box>
                    </Stack>

                    {dispatchersDISP.length > 0 ? renderDispatcherList(dispatchersDISP) : (
                      <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 2, textAlign: 'center', mb: dispatchersCTRL.length > 0 ? 2 : 0 }}>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Nu exista personal programat in dispecerat.
                        </Typography>
                      </Box>
                    )}

                    {dispatchersCTRL.length > 0 && (
                      <>
                        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mt: 2.5, mb: { xs: 1.5, sm: 2 } }}>
                          <Box sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex' }}>
                            <ControlIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                              Personal Control
                            </Typography>
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

        {/* Right Column — Summary cards + Activity */}
        <Grid size={{ xs: 12, lg: 4 }}>
          {/* Cash Total Card */}
          <Grow in={true} timeout={600}>
            <Card
              sx={{
                mb: { xs: 2, sm: 3 },
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                  : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.4)' },
              }}
              onClick={goToParking}
            >
              <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
              <CardContent sx={{ p: { xs: 2, sm: 2.5 }, position: 'relative' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="overline" sx={{ fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.5px', opacity: 0.9 }}>
                      Total Incasari Automate
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } }}>
                      {stats?.parking?.cashCollectionTotals
                        ? formatRONCompact(stats.parking.cashCollectionTotals.totalAmount || 0)
                        : '0 RON'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', opacity: 0.85 }}>
                      {stats?.parking?.cashCollectionTotals ? `${stats.parking.cashCollectionTotals.count || 0} ridicari` : 'Nicio ridicare'}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', flexShrink: 0 }}>
                    <CashIcon sx={{ fontSize: 28 }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grow>

          {/* Handicap Overview Chart */}
          <Box sx={{ mb: { xs: 2, sm: 3 } }}>
            <Suspense fallback={null}>
              <StatusDistributionChart
                title="Parcari Handicap"
                icon={<AccessibleIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />}
                height={{ xs: 160, sm: 190 }}
                data={[
                  { label: 'Amplasare', value: stats?.handicap?.requestsByType?.amplasare || 0, color: theme.palette.success.main },
                  { label: 'Revocare', value: stats?.handicap?.requestsByType?.revocare || 0, color: theme.palette.error.main },
                  { label: 'Marcaje', value: stats?.handicap?.requestsByType?.marcaje || 0, color: theme.palette.info.main },
                  { label: 'Legitimatii HC', value: stats?.handicap?.legitimationsCount || 0, color: theme.palette.warning.main },
                  { label: 'Legitimatii Rev', value: stats?.handicap?.revolutionarCount || 0, color: theme.palette.secondary.main },
                ]}
              />
            </Suspense>
          </Box>

          {/* Parking Quick Summary */}
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
                    { label: 'Probleme active', value: stats?.parking?.activeIssues || 0, color: theme.palette.error.main, urgent: (stats?.parking?.urgentIssues?.length || 0) > 0 },
                    { label: 'Prejudicii active', value: stats?.parking?.activeDamages || 0, color: theme.palette.warning.main, urgent: (stats?.parking?.urgentDamages?.length || 0) > 0 },
                    { label: 'Cereri editare', value: stats?.parking?.pendingEditRequests || 0, color: theme.palette.secondary.main, urgent: (stats?.parking?.pendingEditRequests || 0) > 0 },
                    { label: 'Incasari automate', value: stats?.parking?.cashCollectionTotals?.count || 0, color: theme.palette.success.main, urgent: false },
                  ].map((item) => (
                    <Stack
                      key={item.label}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        bgcolor: alpha(item.color, 0.06),
                        borderLeft: `3px solid ${item.color}`,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {item.label}
                      </Typography>
                      <Chip
                        label={item.value}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: item.urgent ? item.color : alpha(item.color, 0.15),
                          color: item.urgent ? 'white' : item.color,
                          height: 24,
                          minWidth: 32,
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                    </Stack>
                  ))}
                </Stack>
                <Button
                  fullWidth
                  variant="text"
                  endIcon={<ArrowIcon />}
                  onClick={goToParking}
                  sx={{ mt: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  Vezi toate parcarile
                </Button>
              </CardContent>
            </Card>
          </Fade>

          {/* Equipment Stock & Daily Reports */}
          <Fade in={true} timeout={950}>
            <Card sx={{ mb: { xs: 2, sm: 3 } }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack spacing={2.5}>
                  {/* Equipment Stock */}
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <InventoryIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />
                      <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                        Stoc Echipamente
                      </Typography>
                    </Stack>
                    <Stack spacing={1}>
                      {[
                        { label: 'Definitii', value: stats?.equipmentStock?.definitionsCount || 0, color: theme.palette.primary.main },
                        { label: 'Cantitate totala', value: stats?.equipmentStock?.totalQuantity || 0, color: theme.palette.success.main },
                        { label: 'Categorii', value: stats?.equipmentStock?.categoriesCount || 0, color: theme.palette.info.main },
                      ].map((item) => (
                        <Stack
                          key={item.label}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{
                            p: 1.25,
                            borderRadius: 1.5,
                            bgcolor: alpha(item.color, 0.06),
                            borderLeft: `3px solid ${item.color}`,
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            {item.label}
                          </Typography>
                          <Chip
                            label={item.value}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: alpha(item.color, 0.15),
                              color: item.color,
                              height: 24,
                              minWidth: 32,
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  </Box>

                  {/* Daily Reports */}
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <DescriptionIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                      <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                        Rapoarte Zilnice — Azi
                      </Typography>
                    </Stack>
                    <Stack spacing={1}>
                      {[
                        { label: 'Trimise', value: stats?.dailyReports?.submittedToday || 0, color: theme.palette.success.main },
                        { label: 'Draft', value: stats?.dailyReports?.draftToday || 0, color: theme.palette.grey[500] },
                      ].map((item) => (
                        <Stack
                          key={item.label}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{
                            p: 1.25,
                            borderRadius: 1.5,
                            bgcolor: alpha(item.color, 0.06),
                            borderLeft: `3px solid ${item.color}`,
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            {item.label}
                          </Typography>
                          <Chip
                            label={item.value}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: alpha(item.color, 0.15),
                              color: item.color,
                              height: 24,
                              minWidth: 32,
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Fade>

          {/* Recent Activity */}
          <Fade in={true} timeout={700}>
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <NotifIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                    Activitate Recenta
                  </Typography>
                </Stack>
                {recentNotifications.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Nicio activitate recenta
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {recentNotifications.map((notif) => (
                      <Box
                        key={notif.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: notif.isRead
                            ? alpha(theme.palette.action.hover, 0.3)
                            : alpha(theme.palette.primary.main, 0.06),
                          borderLeft: notif.isRead
                            ? `3px solid ${alpha(theme.palette.divider, 0.3)}`
                            : `3px solid ${theme.palette.primary.main}`,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: notif.isRead ? 400 : 600, fontSize: '0.8rem', lineHeight: 1.4, mb: 0.5 }}
                          noWrap
                        >
                          {notif.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: '0.7rem',
                          }}
                        >
                          {notif.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', mt: 0.5, display: 'block' }}>
                          {getTimeAgo(notif.createdAt)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Fade>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
