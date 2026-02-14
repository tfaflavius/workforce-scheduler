import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  CircularProgress,
  Divider,
  Grow,
  Fade,
  alpha,
  useTheme,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  PendingActions as PendingIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  Cancel as RejectedIcon,
  SwapHoriz as SwapIcon,
  BeachAccess as BeachIcon,
  TrendingUp as TrendingIcon,
  ReportProblem as IssuesIcon,
  Warning as DamagesIcon,
  LocalAtm as CashIcon,
  Edit as EditIcon,
  AddLocation as AmplasareIcon,
  RemoveCircle as RevocareIcon,
  Brush as MarcajeIcon,
  Badge as LegitimatiiIcon,
  MilitaryTech as RevolutionarIcon,
  Headset as DispatcherIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Security as ControlIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery, useGetTodayDispatchersQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useGetAllSwapRequestsQuery } from '../../store/api/shiftSwaps.api';
import { useGetAllLeaveRequestsQuery } from '../../store/api/leaveRequests.api';
import {
  useGetParkingIssuesQuery,
  useGetUrgentIssuesQuery,
  useGetParkingDamagesQuery,
  useGetUrgentDamagesQuery,
  useGetCashCollectionTotalsQuery,
  useGetPendingEditRequestsCountQuery,
} from '../../store/api/parking.api';
import {
  useGetHandicapRequestsQuery,
  useGetHandicapLegitimationsQuery,
  useGetRevolutionarLegitimationsQuery,
} from '../../store/api/handicap.api';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
  delay?: number;
  urgent?: boolean;
}

const StatCard = ({ title, value, subtitle, icon, color, bgColor, onClick, delay = 0, urgent }: StatCardProps) => {
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
          border: urgent ? `2px solid ${color}` : 'none',
          '&:hover': onClick ? {
            transform: 'translateY(-6px)',
            boxShadow: theme.palette.mode === 'light'
              ? `0 12px 28px ${alpha(color, 0.25)}`
              : `0 12px 28px ${alpha(color, 0.4)}`,
          } : {},
          '&::before': urgent ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: color,
          } : {},
        }}
        onClick={onClick}
      >
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: alpha(color, 0.08),
          }}
        />
        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 }, position: 'relative' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.75rem' },
                  letterSpacing: '0.5px',
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  color,
                  fontWeight: 800,
                  my: 0.5,
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
                  lineHeight: 1,
                }}
              >
                {value}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                    mt: 0.5,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                p: { xs: 1.25, sm: 1.5, md: 2 },
                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                bgcolor: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 4px 14px ${alpha(color, 0.25)}`,
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const { data: pendingSchedules, isLoading: pendingLoading } = useGetSchedulesQuery({ status: 'PENDING_APPROVAL' });
  const { data: approvedSchedules, isLoading: approvedLoading } = useGetSchedulesQuery({ status: 'APPROVED' });
  const { data: rejectedSchedules, isLoading: rejectedLoading } = useGetSchedulesQuery({ status: 'REJECTED' });
  const { data: users, isLoading: usersLoading } = useGetUsersQuery({});
  const { data: swapRequests = [], isLoading: swapsLoading } = useGetAllSwapRequestsQuery({});
  const { data: leaveRequests = [], isLoading: leavesLoading } = useGetAllLeaveRequestsQuery();

  // Parking queries
  const { data: activeIssues = [] } = useGetParkingIssuesQuery('ACTIVE');
  const { data: urgentIssues = [] } = useGetUrgentIssuesQuery();
  const { data: activeDamages = [] } = useGetParkingDamagesQuery('ACTIVE');
  const { data: urgentDamages = [] } = useGetUrgentDamagesQuery();
  const { data: cashTotals } = useGetCashCollectionTotalsQuery({});
  const { data: pendingEditRequests } = useGetPendingEditRequestsCountQuery();

  // Handicap queries
  const { data: handicapRequests = [] } = useGetHandicapRequestsQuery();
  const { data: handicapLegitimations = [] } = useGetHandicapLegitimationsQuery();
  const { data: revolutionarLegitimations = [] } = useGetRevolutionarLegitimationsQuery();

  // Today's dispatchers query
  const { data: todayDispatchers = [], isLoading: dispatchersLoading } = useGetTodayDispatchersQuery();

  const isLoading = pendingLoading || approvedLoading || rejectedLoading || usersLoading || swapsLoading || leavesLoading || dispatchersLoading;

  // Loading state - after all hooks
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  const activeUsers = users?.filter(u => u.isActive)?.length || 0;
  const pendingSwaps = swapRequests.filter(r => r.status === 'AWAITING_ADMIN').length;
  const pendingLeaves = leaveRequests.filter(r => r.status === 'PENDING').length;
  const pendingCount = pendingSchedules?.length || 0;

  return (
    <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
      {/* Header */}
      <Fade in={true} timeout={600}>
        <Box
          sx={{
            mb: { xs: 2.5, sm: 3, md: 4 },
            p: { xs: 2.5, sm: 3, md: 4 },
            borderRadius: { xs: 2, sm: 3 },
            background: theme.palette.mode === 'light'
              ? 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)'
              : 'linear-gradient(135deg, #1e40af 0%, #5b21b6 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(30, 58, 138, 0.3)',
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

          <Stack direction="row" alignItems="center" spacing={2} sx={{ position: 'relative' }}>
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.15)',
                display: { xs: 'none', sm: 'flex' },
              }}
            >
              <TrendingIcon sx={{ fontSize: { sm: 32, md: 40 } }} />
            </Box>
            <Box>
              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{
                  fontSize: { xs: '1.35rem', sm: '1.5rem', md: '1.85rem' },
                  mb: 0.5,
                }}
              >
                Dashboard Administrator
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  fontSize: { xs: '0.8rem', sm: '0.875rem', md: '1rem' }
                }}
              >
                Gestioneaza programele de lucru si utilizatorii
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Fade>

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

      {/* Programe Section */}
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
            📅 Programe
          </Typography>
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="In Asteptare"
                value={pendingCount}
                subtitle="Necesita aprobare"
                icon={<PendingIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#f59e0b' }} />}
                color="#f59e0b"
                bgColor={alpha('#f59e0b', 0.12)}
                onClick={() => navigate('/schedules/pending')}
                delay={0}
                urgent={pendingCount > 0}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="Aprobate"
                value={approvedSchedules?.length || 0}
                subtitle="Active"
                icon={<CalendarIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#10b981' }} />}
                color="#10b981"
                bgColor={alpha('#10b981', 0.12)}
                onClick={() => navigate('/schedules')}
                delay={100}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="Respinse"
                value={rejectedSchedules?.length || 0}
                subtitle="Necesita revizuire"
                icon={<RejectedIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#ef4444' }} />}
                color="#ef4444"
                bgColor={alpha('#ef4444', 0.12)}
                onClick={() => navigate('/schedules/rejected')}
                delay={200}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="Utilizatori Activi"
                value={activeUsers}
                subtitle="Total"
                icon={<PeopleIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#2563eb' }} />}
                color="#2563eb"
                bgColor={alpha('#2563eb', 0.12)}
                onClick={() => navigate('/users')}
                delay={300}
              />
            </Grid>
          </Grid>
        </Box>
      </Fade>

      <Divider sx={{ my: { xs: 2, sm: 3 } }} />

      {/* Schimburi si Concedii Section */}
      <Fade in={true} timeout={900}>
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
            🔄 Schimburi Ture & Concedii
          </Typography>
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="Schimburi Pending"
                value={pendingSwaps}
                subtitle="Necesita aprobare"
                icon={<SwapIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#06b6d4' }} />}
                color="#06b6d4"
                bgColor={alpha('#06b6d4', 0.12)}
                onClick={() => navigate('/admin/shift-swaps')}
                delay={400}
                urgent={pendingSwaps > 0}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="Concedii Pending"
                value={pendingLeaves}
                subtitle="Necesita aprobare"
                icon={<BeachIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#8b5cf6' }} />}
                color="#8b5cf6"
                bgColor={alpha('#8b5cf6', 0.12)}
                onClick={() => navigate('/admin/leave-requests')}
                delay={500}
                urgent={pendingLeaves > 0}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="Total Schimburi"
                value={swapRequests.length}
                subtitle="Toate cererile"
                icon={<SwapIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#64748b' }} />}
                color="#64748b"
                bgColor={alpha('#64748b', 0.12)}
                onClick={() => navigate('/admin/shift-swaps')}
                delay={600}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 3 }}>
              <StatCard
                title="Total Concedii"
                value={leaveRequests.length}
                subtitle="Toate cererile"
                icon={<BeachIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#64748b' }} />}
                color="#64748b"
                bgColor={alpha('#64748b', 0.12)}
                onClick={() => navigate('/admin/leave-requests')}
                delay={700}
              />
            </Grid>
          </Grid>
        </Box>
      </Fade>

      <Divider sx={{ my: { xs: 2, sm: 3 } }} />

      {/* Parcari Etajate Section */}
      <Fade in={true} timeout={1100}>
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
                delay={800}
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
                delay={900}
                urgent={urgentDamages.length > 0}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 4 }}>
              <StatCard
                title="Cereri Editare"
                value={pendingEditRequests?.count || 0}
                subtitle="In asteptare aprobare"
                icon={<EditIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#8b5cf6' }} />}
                color="#8b5cf6"
                bgColor={alpha('#8b5cf6', 0.12)}
                onClick={() => navigate('/admin/edit-requests')}
                delay={950}
                urgent={(pendingEditRequests?.count || 0) > 0}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 4 }}>
              {/* Cash Summary Card - Special Design */}
              <Grow in={true} timeout={1400}>
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
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="overline"
                          sx={{
                            fontWeight: 600,
                            fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.75rem' },
                            letterSpacing: '0.5px',
                            opacity: 0.9,
                          }}
                        >
                          Total Incasari Automate
                        </Typography>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 800,
                            my: 0.5,
                            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                            lineHeight: 1,
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
                            fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                            mt: 0.5,
                            opacity: 0.85,
                          }}
                        >
                          {cashTotals ? `${cashTotals.count || 0} ridicari inregistrate` : 'Nicio ridicare'}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          p: { xs: 1.25, sm: 1.5, md: 2 },
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

      <Divider sx={{ my: { xs: 2, sm: 3 } }} />

      {/* Parcari Handicap Section */}
      <Fade in={true} timeout={1300}>
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
            ♿ Parcari Handicap - Solicitari
          </Typography>
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            <Grid size={{ xs: 6, sm: 6, md: 4 }}>
              <StatCard
                title="Amplasare Panouri"
                value={handicapRequests.filter(r => r.requestType === 'AMPLASARE_PANOU').length}
                subtitle={`${handicapRequests.filter(r => r.requestType === 'AMPLASARE_PANOU' && r.status === 'ACTIVE').length} active`}
                icon={<AmplasareIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#059669' }} />}
                color="#059669"
                bgColor={alpha('#059669', 0.12)}
                onClick={() => navigate('/parking/handicap')}
                delay={1000}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 4 }}>
              <StatCard
                title="Revocare Panouri"
                value={handicapRequests.filter(r => r.requestType === 'REVOCARE_PANOU').length}
                subtitle={`${handicapRequests.filter(r => r.requestType === 'REVOCARE_PANOU' && r.status === 'ACTIVE').length} active`}
                icon={<RevocareIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#dc2626' }} />}
                color="#dc2626"
                bgColor={alpha('#dc2626', 0.12)}
                onClick={() => navigate('/parking/handicap')}
                delay={1100}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 4 }}>
              <StatCard
                title="Creare Marcaje"
                value={handicapRequests.filter(r => r.requestType === 'CREARE_MARCAJ').length}
                subtitle={`${handicapRequests.filter(r => r.requestType === 'CREARE_MARCAJ' && r.status === 'ACTIVE').length} active`}
                icon={<MarcajeIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#0284c7' }} />}
                color="#0284c7"
                bgColor={alpha('#0284c7', 0.12)}
                onClick={() => navigate('/parking/handicap')}
                delay={1200}
              />
            </Grid>
          </Grid>
        </Box>
      </Fade>

      <Divider sx={{ my: { xs: 2, sm: 3 } }} />

      {/* Legitimatii Section */}
      <Fade in={true} timeout={1500}>
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
                icon={<LegitimatiiIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#059669' }} />}
                color="#059669"
                bgColor={alpha('#059669', 0.12)}
                onClick={() => navigate('/parking/handicap')}
                delay={1300}
                urgent={handicapLegitimations.filter(l => l.status === 'ACTIVE').length > 0}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 6 }}>
              <StatCard
                title="Legitimatii Revolutionar"
                value={revolutionarLegitimations.length}
                subtitle={`${revolutionarLegitimations.filter(l => l.status === 'ACTIVE').length} active`}
                icon={<RevolutionarIcon sx={{ fontSize: { xs: 22, sm: 26, md: 32 }, color: '#7c3aed' }} />}
                color="#7c3aed"
                bgColor={alpha('#7c3aed', 0.12)}
                onClick={() => navigate('/parking/handicap')}
                delay={1400}
                urgent={revolutionarLegitimations.filter(l => l.status === 'ACTIVE').length > 0}
              />
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </Box>
  );
};

export default AdminDashboard;
