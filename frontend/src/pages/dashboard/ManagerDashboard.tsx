import { useMemo, useState } from 'react';
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
  Paper,
  Divider,
} from '@mui/material';
import {
  PendingActions as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as ScheduleIcon,
  AccessTime as HoursIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useAppSelector } from '../../store/hooks';
import type { WorkSchedule, ScheduleAssignment } from '../../types/schedule.types';

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

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [currentDate] = useState(new Date());

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const monthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const { data: draftSchedules, isLoading: draftLoading } = useGetSchedulesQuery({ status: 'DRAFT' });
  const { data: pendingSchedules, isLoading: pendingLoading } = useGetSchedulesQuery({ status: 'PENDING_APPROVAL' });
  const { data: approvedSchedules, isLoading: approvedLoading } = useGetSchedulesQuery({ status: 'APPROVED' });
  const { data: rejectedSchedules, isLoading: rejectedLoading } = useGetSchedulesQuery({ status: 'REJECTED' });

  // Query pentru programul propriu al managerului
  const { data: mySchedules } = useGetSchedulesQuery({
    monthYear,
    status: 'APPROVED',
  });

  // Calculează orele proprii ale managerului - MUST be before any conditional returns
  const myAssignments = useMemo(() => {
    if (!mySchedules || !user) return [];
    const allAssignments: ScheduleAssignment[] = [];
    mySchedules.forEach((schedule: WorkSchedule) => {
      if (schedule.assignments) {
        const userAssignments = schedule.assignments.filter(
          (a) => a.userId === user.id
        );
        allAssignments.push(...userAssignments);
      }
    });
    return allAssignments;
  }, [mySchedules, user]);

  // Calculează zilele lucrătoare și norma de ore pentru luna curentă - MUST be before any conditional returns
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

  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
  ];

  // Loading state - after all hooks
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

  const totalHoursThisMonth = myAssignments.reduce(
    (sum, a) => sum + (a.durationHours || 0),
    0
  );
  const totalShiftsThisMonth = myAssignments.length;
  const nightShifts = myAssignments.filter((a) => a.shiftType?.isNightShift).length;
  const dayShifts = totalShiftsThisMonth - nightShifts;

  const monthlyHoursNorm = workingDaysInMonth * 8;
  const hoursDifference = totalHoursThisMonth - monthlyHoursNorm;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
          sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } }}
        >
          Dashboard Manager
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          Gestioneaza programele de lucru ale echipei tale
        </Typography>
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

      <Grid container spacing={{ xs: 2, sm: 3 }}>
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

      {/* Programul propriu al managerului */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <HoursIcon color="primary" />
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Programul Meu - {monthNames[currentMonth - 1]} {currentYear}
          </Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Typography variant="h5" fontWeight="bold" color="primary.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {totalHoursThisMonth}h
              </Typography>
              <Typography variant="caption" color="text.secondary">Total Ore</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Typography variant="h5" fontWeight="bold" color="text.secondary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {monthlyHoursNorm}h
              </Typography>
              <Typography variant="caption" color="text.secondary">Norma ({workingDaysInMonth} zile × 8h)</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  color: hoursDifference > 0 ? 'error.main' : hoursDifference < 0 ? 'warning.main' : 'success.main',
                }}
              >
                {hoursDifference > 0 ? `+${hoursDifference}` : hoursDifference}h
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {hoursDifference > 0 ? 'Ore Suplimentare' : hoursDifference < 0 ? 'Sub Normă' : 'Conform Normei'}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {totalShiftsThisMonth}
              </Typography>
              <Typography variant="caption" color="text.secondary">Total Ture</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Typography variant="h5" fontWeight="bold" color="warning.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {dayShifts}
              </Typography>
              <Typography variant="caption" color="text.secondary">Ture Zi</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Typography variant="h5" fontWeight="bold" color="info.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {nightShifts}
              </Typography>
              <Typography variant="caption" color="text.secondary">Ture Noapte</Typography>
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="outlined" size="small" onClick={() => navigate('/my-schedule')}>
            Vezi Program Complet
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ManagerDashboard;
