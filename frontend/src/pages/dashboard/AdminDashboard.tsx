import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  PendingActions as PendingIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
}

const StatCard = ({ title, value, subtitle, icon, color, bgColor, onClick }: StatCardProps) => (
  <Card
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
      height: '100%',
      '&:hover': onClick ? {
        transform: 'translateY(-4px)',
        boxShadow: 4,
      } : {},
    }}
    onClick={onClick}
  >
    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 500, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
          >
            {title}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              color,
              fontWeight: 700,
              my: 0.5,
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: pendingSchedules, isLoading: pendingLoading } = useGetSchedulesQuery({ status: 'PENDING_APPROVAL' });
  const { data: approvedSchedules, isLoading: approvedLoading } = useGetSchedulesQuery({ status: 'APPROVED' });
  const { data: users, isLoading: usersLoading } = useGetUsersQuery({});

  if (pendingLoading || approvedLoading || usersLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const activeUsers = users?.filter(u => u.isActive)?.length || 0;

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
          sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } }}
        >
          Dashboard Administrator
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          Gestioneaza programele de lucru si utilizatorii
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Programe in Asteptare"
            value={pendingSchedules?.length || 0}
            subtitle="Necesita aprobare"
            icon={<PendingIcon sx={{ fontSize: 32, color: '#ed6c02' }} />}
            color="#ed6c02"
            bgColor="#fff3e0"
            onClick={() => navigate('/schedules/pending')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Programe Aprobate"
            value={approvedSchedules?.length || 0}
            subtitle="Active"
            icon={<CalendarIcon sx={{ fontSize: 32, color: '#2e7d32' }} />}
            color="#2e7d32"
            bgColor="#e8f5e9"
            onClick={() => navigate('/schedules')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Utilizatori Activi"
            value={activeUsers}
            subtitle="Total"
            icon={<PeopleIcon sx={{ fontSize: 32, color: '#1976d2' }} />}
            color="#1976d2"
            bgColor="#e3f2fd"
            onClick={() => navigate('/users')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/schedules/create')}
            sx={{
              py: 1.5,
              minHeight: 56,
              fontSize: '0.85rem',
            }}
          >
            Program Nou
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<PendingIcon />}
            onClick={() => navigate('/schedules/pending')}
            sx={{
              py: 1.5,
              minHeight: 56,
              fontSize: '0.85rem',
            }}
          >
            Aprobări
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<PeopleIcon />}
            onClick={() => navigate('/users')}
            sx={{
              py: 1.5,
              minHeight: 56,
              fontSize: '0.85rem',
            }}
          >
            Utilizatori
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
