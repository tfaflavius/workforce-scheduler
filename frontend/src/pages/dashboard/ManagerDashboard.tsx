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
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useAppSelector } from '../../store/hooks';
import type { WorkSchedule } from '../../types/schedule.types';
import {
  useGetParkingIssuesQuery,
  useGetUrgentIssuesQuery,
  useGetParkingDamagesQuery,
  useGetUrgentDamagesQuery,
  useGetCashCollectionTotalsQuery,
} from '../../store/api/parking.api';

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

  // Loading state
  if (draftLoading || pendingLoading || approvedLoading || rejectedLoading) {
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
      <Fade in={true} timeout={600}>
        <Box
          sx={{
            mb: { xs: 2.5, sm: 3, md: 4 },
            p: { xs: 2.5, sm: 3, md: 4 },
            borderRadius: { xs: 2, sm: 3 },
            background: theme.palette.mode === 'light'
              ? 'linear-gradient(135deg, #059669 0%, #0891b2 100%)'
              : 'linear-gradient(135deg, #047857 0%, #0e7490 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(5, 150, 105, 0.3)',
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
              <GroupsIcon sx={{ fontSize: { sm: 32, md: 40 } }} />
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
                Dashboard Manager
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  fontSize: { xs: '0.8rem', sm: '0.875rem', md: '1rem' }
                }}
              >
                Gestioneaza programele de lucru ale echipei tale
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Fade>

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
    </Box>
  );
};

export default ManagerDashboard;
