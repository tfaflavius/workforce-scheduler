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
  Alert,
} from '@mui/material';
import {
  PendingActions as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useAppSelector } from '../../store/hooks';
import type { WorkSchedule } from '../../types/schedule.types';

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

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const { data: draftSchedules, isLoading: draftLoading } = useGetSchedulesQuery({ status: 'DRAFT' });
  const { data: pendingSchedules, isLoading: pendingLoading } = useGetSchedulesQuery({ status: 'PENDING_APPROVAL' });
  const { data: approvedSchedules, isLoading: approvedLoading } = useGetSchedulesQuery({ status: 'APPROVED' });
  const { data: rejectedSchedules, isLoading: rejectedLoading } = useGetSchedulesQuery({ status: 'REJECTED' });

  if (draftLoading || pendingLoading || approvedLoading || rejectedLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const myDrafts = draftSchedules?.filter((s: WorkSchedule) => s.createdBy === user?.id) || [];
  const myPending = pendingSchedules?.filter((s: WorkSchedule) => s.createdBy === user?.id) || [];
  const myApproved = approvedSchedules?.filter((s: WorkSchedule) => s.createdBy === user?.id) || [];
  const myRejected = rejectedSchedules?.filter((s: WorkSchedule) => s.createdBy === user?.id) || [];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Dashboard Manager
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gestioneaza programele de lucru ale echipei tale
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/schedules/create')}
          >
            Program Nou
          </Button>
        </Stack>
      </Box>

      {myRejected.length > 0 && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/schedules')}>
              Vezi detalii
            </Button>
          }
        >
          Ai {myRejected.length} program(e) respins(e) care necesita atentie!
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Draft-uri"
            value={myDrafts.length}
            subtitle="De finalizat"
            icon={<ScheduleIcon sx={{ fontSize: 32, color: '#757575' }} />}
            color="#757575"
            bgColor="#f5f5f5"
            onClick={() => navigate('/schedules')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="In Asteptare"
            value={myPending.length}
            subtitle="Trimise spre aprobare"
            icon={<PendingIcon sx={{ fontSize: 32, color: '#ed6c02' }} />}
            color="#ed6c02"
            bgColor="#fff3e0"
            onClick={() => navigate('/schedules')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Aprobate"
            value={myApproved.length}
            subtitle="Active"
            icon={<ApprovedIcon sx={{ fontSize: 32, color: '#2e7d32' }} />}
            color="#2e7d32"
            bgColor="#e8f5e9"
            onClick={() => navigate('/schedules')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Respinse"
            value={myRejected.length}
            subtitle="De revizuit"
            icon={<RejectedIcon sx={{ fontSize: 32, color: '#d32f2f' }} />}
            color="#d32f2f"
            bgColor="#ffebee"
            onClick={() => navigate('/schedules')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
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
        <Grid size={{ xs: 12, sm: 6 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<ScheduleIcon />}
            onClick={() => navigate('/schedules')}
            sx={{ py: 2 }}
          >
            Toate Programele
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ManagerDashboard;
