import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  CircularProgress,
  Alert,
  Button,
  Grow,
  Fade,
  Divider,
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
  PendingActions as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as ScheduleIcon,
  Groups as GroupsIcon,
  ReportProblem as IssuesIcon,
  Warning as DamagesIcon,
  LocalAtm as CashIcon,
  Headset as DispatcherIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Security as ControlIcon,
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
import { StatCard } from '../../components/common/StatCard';
import { useGetCarStatusTodayQuery } from '../../store/api/pvDisplay.api';
import { DirectionsCar as CarIcon } from '@mui/icons-material';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAppSelector((state) => state.auth);

  const { data: draftSchedules, isLoading: draftLoading } = useGetSchedulesQuery({ status: 'DRAFT' });
  const { data: pendingSchedules, isLoading: pendingLoading } = useGetSchedulesQuery({ status: 'PENDING_APPROVAL' });
  const { data: approvedSchedules, isLoading: approvedLoading } = useGetSchedulesQuery({ status: 'APPROVED' });
  const { data: rejectedSchedules, isLoading: rejectedLoading } = useGetSchedulesQuery({ status: 'REJECTED' });

  // Parking queries
  const { data: activeIssues = [] } = useGetParkingIssuesQuery('ACTIVE');
  const { data: urgentIssues = [] } = useGetUrgentIssuesQuery();
  const { data: activeDamages = [] } = useGetParkingDamagesQuery('ACTIVE');
  const { data: urgentDamages = [] } = useGetUrgentDamagesQuery();
  const { data: cashTotals } = useGetCashCollectionTotalsQuery({});

  // Today's dispatchers query
  const { data: todayDispatchers = [], isLoading: dispatchersLoading } = useGetTodayDispatchersQuery();

  // PV Car status
  const { data: carStatus } = useGetCarStatusTodayQuery();

  // Loading state
  if (draftLoading || pendingLoading || approvedLoading || rejectedLoading || dispatchersLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  const myDrafts = draftSchedules?.filter((s: WorkSchedule) => s.createdBy === user?.id) || [];
  const myPending = pendingSchedules?.filter((s: WorkSchedule) => s.createdBy === user?.id) || [];
  const myApproved = approvedSchedules?.filter((s: WorkSchedule) => s.createdBy === user?.id) || [];
  const myRejected = rejectedSchedules?.filter((s: WorkSchedule) => s.createdBy === user?.id) || [];

  return (
    <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
      {/* Header */}
      <GradientHeader
        title="Dashboard Manager"
        subtitle="Gestioneaza programele de lucru ale echipei tale"
        icon={<GroupsIcon />}
        gradient="#059669 0%, #0891b2 100%"
      />

      {/* Alert for rejected schedules */}
      {myRejected.length > 0 && (
        <Fade in={true} timeout={700}>
          <Alert
            severity="error"
            sx={{
              mb: { xs: 2, sm: 3 },
              borderRadius: 2,
              '& .MuiAlert-message': {
                width: '100%',
              },
            }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => navigate('/schedules')}
                sx={{ fontWeight: 600 }}
              >
                Vezi detalii
              </Button>
            }
          >
            <Typography variant="body2" fontWeight="medium">
              ⚠️ Ai {myRejected.length} program(e) respins(e) care necesita atentie!
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* PV Car Status Banner */}
      {carStatus?.carInUse && (
        <Fade in={true} timeout={500}>
          <Alert
            severity="warning"
            icon={<CarIcon />}
            sx={{
              mb: { xs: 2, sm: 3 },
              borderRadius: 2,
              '& .MuiAlert-message': { width: '100%' },
            }}
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

      {/* Today's Dispatchers Section */}
      {(() => {
        const dispatchersDISP = todayDispatchers.filter(d => d.workPositionCode === 'DISP');
        const dispatchersCTRL = todayDispatchers.filter(d => d.workPositionCode === 'CTRL');
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
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      color="white"
                      sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}
                      noWrap
                    >
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
                          bgcolor: dispatcher.shiftCode === 'Z' ? '#fbbf24' : dispatcher.shiftCode === 'N' ? '#8b5cf6' : '#10b981',
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
                🎧 Dispecerat Astazi - {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Typography>
              <Grow in={true} timeout={600}>
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
                    {/* Dispecerat */}
                    <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                      <Box
                        sx={{
                          p: { xs: 1, sm: 1.5 },
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.2)',
                          display: 'flex',
                        }}
                      >
                        <DispatcherIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                          Personal Dispecerat
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {dispatchersDISP.length > 0
                            ? `${dispatchersDISP.length} ${dispatchersDISP.length === 1 ? 'persoana programata' : 'persoane programate'}`
                            : 'Nicio persoana programata'}
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

                    {/* Control - doar daca exista */}
                    {dispatchersCTRL.length > 0 && (
                      <>
                        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ mt: 2.5, mb: { xs: 1.5, sm: 2 } }}>
                          <Box
                            sx={{
                              p: { xs: 1, sm: 1.5 },
                              borderRadius: 2,
                              bgcolor: 'rgba(255,255,255,0.2)',
                              display: 'flex',
                            }}
                          >
                            <ControlIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                              Personal Control
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              {`${dispatchersCTRL.length} ${dispatchersCTRL.length === 1 ? 'persoana programata' : 'persoane programate'}`}
                            </Typography>
                          </Box>
                        </Stack>
                        {renderDispatcherList(dispatchersCTRL)}
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grow>
            </Box>
          </Fade>
        );
      })()}

      <Divider sx={{ my: { xs: 2, sm: 3 } }} />

      {/* Stats Cards */}
      <Fade in={true} timeout={800}>
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
            📊 Programele Mele
          </Typography>
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="Draft-uri"
                value={myDrafts.length}
                subtitle="De finalizat"
                icon={<ScheduleIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#64748b' }} />}
                color="#64748b"
                bgColor={alpha('#64748b', 0.12)}
                onClick={() => navigate('/schedules')}
                delay={0}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="In Asteptare"
                value={myPending.length}
                subtitle="Trimise spre aprobare"
                icon={<PendingIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#f59e0b' }} />}
                color="#f59e0b"
                bgColor={alpha('#f59e0b', 0.12)}
                onClick={() => navigate('/schedules')}
                delay={100}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="Aprobate"
                value={myApproved.length}
                subtitle="Active"
                icon={<ApprovedIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#10b981' }} />}
                color="#10b981"
                bgColor={alpha('#10b981', 0.12)}
                onClick={() => navigate('/schedules')}
                delay={200}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="Respinse"
                value={myRejected.length}
                subtitle="De revizuit"
                icon={<RejectedIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#ef4444' }} />}
                color="#ef4444"
                bgColor={alpha('#ef4444', 0.12)}
                onClick={() => navigate('/schedules')}
                delay={300}
                urgent={myRejected.length > 0}
              />
            </Grid>
          </Grid>
        </Box>
      </Fade>

      <Divider sx={{ my: { xs: 2, sm: 3 } }} />

      {/* Parcari Etajate Section */}
      <Fade in={true} timeout={1000}>
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
            🅿️ Parcari Etajate
          </Typography>
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            <Grid size={{ xs: 6, sm: 6, md: 4 }}>
              <StatCard
                title="Probleme Active"
                value={activeIssues.length}
                subtitle={urgentIssues.length > 0 ? `${urgentIssues.length} urgente` : 'Niciuna urgenta'}
                icon={<IssuesIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#ef4444' }} />}
                color="#ef4444"
                bgColor={alpha('#ef4444', 0.12)}
                onClick={() => navigate('/parking')}
                delay={400}
                urgent={urgentIssues.length > 0}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 4 }}>
              <StatCard
                title="Prejudicii Active"
                value={activeDamages.length}
                subtitle={urgentDamages.length > 0 ? `${urgentDamages.length} urgente` : 'Niciuna urgenta'}
                icon={<DamagesIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#f59e0b' }} />}
                color="#f59e0b"
                bgColor={alpha('#f59e0b', 0.12)}
                onClick={() => navigate('/parking')}
                delay={500}
                urgent={urgentDamages.length > 0}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 12, md: 4 }}>
              {/* Cash Summary Card - Special Design */}
              <Grow in={true} timeout={1100}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    height: '100%',
                    background: theme.palette.mode === 'light'
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 12px 28px rgba(16, 185, 129, 0.35)',
                    },
                  }}
                  onClick={() => navigate('/parking')}
                >
                  {/* Decorative circle */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -30,
                      right: -30,
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.15)',
                    }}
                  />
                  <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 }, position: 'relative' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={{ xs: 1, sm: 2 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="overline"
                          sx={{
                            fontWeight: 600,
                            fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.75rem' },
                            letterSpacing: '0.5px',
                            opacity: 0.9,
                            lineHeight: 1.3,
                          }}
                        >
                          Total Incasari Automate
                        </Typography>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 800,
                            my: 0.5,
                            fontSize: { xs: '1.1rem', sm: '1.75rem', md: '2rem' },
                            lineHeight: 1.1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cashTotals
                            ? new Intl.NumberFormat('ro-RO', {
                                style: 'currency',
                                currency: 'RON',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(cashTotals.totalAmount || 0)
                            : '0 RON'}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' },
                            mt: 0.5,
                            opacity: 0.85,
                            lineHeight: 1.3,
                          }}
                        >
                          {cashTotals ? `${cashTotals.count || 0} ridicari inregistrate` : 'Nicio ridicare'}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          p: { xs: 1, sm: 1.5, md: 2 },
                          borderRadius: { xs: 2, sm: 2.5, md: 3 },
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CashIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 } }} />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grow>
            </Grid>
          </Grid>
        </Box>
      </Fade>

    </Box>
  );
};

export default ManagerDashboard;
