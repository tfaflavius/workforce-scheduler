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
} from '@mui/material';
import {
  PendingActions as PendingIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  Cancel as RejectedIcon,
  SwapHoriz as SwapIcon,
  BeachAccess as BeachIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useGetAllSwapRequestsQuery } from '../../store/api/shiftSwaps.api';
import { useGetAllLeaveRequestsQuery } from '../../store/api/leaveRequests.api';

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

  const isLoading = pendingLoading || approvedLoading || rejectedLoading || usersLoading || swapsLoading || leavesLoading;

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
                Gestionează programele de lucru și utilizatorii
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Fade>

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
                title="În Așteptare"
                value={pendingCount}
                subtitle="Necesită aprobare"
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
                subtitle="Necesită revizuire"
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

      {/* Schimburi și Concedii Section */}
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
                subtitle="Necesită aprobare"
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
                subtitle="Necesită aprobare"
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
    </Box>
  );
};

export default AdminDashboard;
