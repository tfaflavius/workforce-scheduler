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
  Divider,
  Paper,
  Button,
} from '@mui/material';
import {
  PendingActions as PendingIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  Cancel as RejectedIcon,
  SwapHoriz as SwapIcon,
  BeachAccess as BeachIcon,
  AccessTime as HoursIcon,
} from '@mui/icons-material';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useGetAllSwapRequestsQuery } from '../../store/api/shiftSwaps.api';
import { useGetAllLeaveRequestsQuery } from '../../store/api/leaveRequests.api';
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [currentDate] = useState(new Date());

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const monthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const { data: pendingSchedules, isLoading: pendingLoading } = useGetSchedulesQuery({ status: 'PENDING_APPROVAL' });
  const { data: approvedSchedules, isLoading: approvedLoading } = useGetSchedulesQuery({ status: 'APPROVED' });
  const { data: rejectedSchedules, isLoading: rejectedLoading } = useGetSchedulesQuery({ status: 'REJECTED' });
  const { data: users, isLoading: usersLoading } = useGetUsersQuery({});
  const { data: swapRequests = [], isLoading: swapsLoading } = useGetAllSwapRequestsQuery({});
  const { data: leaveRequests = [], isLoading: leavesLoading } = useGetAllLeaveRequestsQuery();

  // Query pentru programul propriu al adminului
  const { data: mySchedules } = useGetSchedulesQuery({
    monthYear,
    status: 'APPROVED',
  });

  const isLoading = pendingLoading || approvedLoading || rejectedLoading || usersLoading || swapsLoading || leavesLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const activeUsers = users?.filter(u => u.isActive)?.length || 0;
  const pendingSwaps = swapRequests.filter(r => r.status === 'AWAITING_ADMIN').length;
  const pendingLeaves = leaveRequests.filter(r => r.status === 'PENDING').length;

  // Calculează orele proprii ale adminului
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

  const totalHoursThisMonth = myAssignments.reduce(
    (sum, a) => sum + (a.durationHours || 0),
    0
  );
  const totalShiftsThisMonth = myAssignments.length;
  const nightShifts = myAssignments.filter((a) => a.shiftType?.isNightShift).length;
  const dayShifts = totalShiftsThisMonth - nightShifts;

  // Calculează zilele lucrătoare și norma de ore pentru luna curentă
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

  const monthlyHoursNorm = workingDaysInMonth * 8;
  const hoursDifference = totalHoursThisMonth - monthlyHoursNorm;

  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
  ];

  return (
    <Box sx={{ width: '100%' }}>
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

      {/* Programe Section */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
        PROGRAME
      </Typography>
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Programe in Asteptare"
            value={pendingSchedules?.length || 0}
            subtitle="Necesita aprobare"
            icon={<PendingIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: '#ed6c02' }} />}
            color="#ed6c02"
            bgColor="#fff3e0"
            onClick={() => navigate('/schedules/pending')}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Programe Aprobate"
            value={approvedSchedules?.length || 0}
            subtitle="Active"
            icon={<CalendarIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: '#2e7d32' }} />}
            color="#2e7d32"
            bgColor="#e8f5e9"
            onClick={() => navigate('/schedules')}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Programe Respinse"
            value={rejectedSchedules?.length || 0}
            subtitle="Necesita revizuire"
            icon={<RejectedIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: '#d32f2f' }} />}
            color="#d32f2f"
            bgColor="#ffebee"
            onClick={() => navigate('/schedules/rejected')}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Utilizatori Activi"
            value={activeUsers}
            subtitle="Total"
            icon={<PeopleIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: '#1976d2' }} />}
            color="#1976d2"
            bgColor="#e3f2fd"
            onClick={() => navigate('/users')}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: { xs: 2, sm: 3 } }} />

      {/* Schimburi și Concedii Section */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
        SCHIMBURI TURE & CONCEDII
      </Typography>
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Schimburi in Asteptare"
            value={pendingSwaps}
            subtitle="Necesita aprobare"
            icon={<SwapIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: '#0288d1' }} />}
            color="#0288d1"
            bgColor="#e1f5fe"
            onClick={() => navigate('/admin/shift-swaps')}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Concedii in Asteptare"
            value={pendingLeaves}
            subtitle="Necesita aprobare"
            icon={<BeachIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: '#7b1fa2' }} />}
            color="#7b1fa2"
            bgColor="#f3e5f5"
            onClick={() => navigate('/admin/leave-requests')}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total Schimburi"
            value={swapRequests.length}
            subtitle="Toate cererile"
            icon={<SwapIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: '#546e7a' }} />}
            color="#546e7a"
            bgColor="#eceff1"
            onClick={() => navigate('/admin/shift-swaps')}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total Concedii"
            value={leaveRequests.length}
            subtitle="Toate cererile"
            icon={<BeachIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: '#546e7a' }} />}
            color="#546e7a"
            bgColor="#eceff1"
            onClick={() => navigate('/admin/leave-requests')}
          />
        </Grid>
      </Grid>

      {/* Programul propriu al adminului */}
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

export default AdminDashboard;
