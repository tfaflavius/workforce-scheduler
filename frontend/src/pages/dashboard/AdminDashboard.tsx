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
      '&:hover': onClick ? {
        transform: 'translateY(-4px)',
        boxShadow: 4,
      } : {},
    }}
    onClick={onClick}
  >
    <CardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography variant="h3" sx={{ color, fontWeight: 700, my: 0.5 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Dashboard Administrator
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestioneaza programele de lucru si utilizatorii
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
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

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/schedules/create')}
            sx={{ py: 2 }}
          >
            Creaza Program Nou
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<PendingIcon />}
            onClick={() => navigate('/schedules/pending')}
            sx={{ py: 2 }}
          >
            Aproba Programe
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<PeopleIcon />}
            onClick={() => navigate('/users')}
            sx={{ py: 2 }}
          >
            Gestioneaza Utilizatori
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
