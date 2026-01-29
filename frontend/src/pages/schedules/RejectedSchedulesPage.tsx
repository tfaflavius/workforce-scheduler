import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
  Avatar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Cancel as RejectedIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';

const RejectedSchedulesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const { data: rejectedSchedules = [], isLoading, error, refetch } = useGetSchedulesQuery({
    status: 'REJECTED',
  });
  const { data: users = [] } = useGetUsersQuery({ isActive: true });

  // Creează un map pentru utilizatori
  const usersMap = useMemo(() => {
    const map: Record<string, any> = {};
    users.forEach(user => {
      map[user.id] = user;
    });
    return map;
  }, [users]);

  // Grupează programele respinse pe lună
  const groupedSchedules = useMemo(() => {
    const groups: Record<string, typeof rejectedSchedules> = {};
    rejectedSchedules.forEach(schedule => {
      const monthYear = `${schedule.year}-${String(schedule.month).padStart(2, '0')}`;
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(schedule);
    });
    return groups;
  }, [rejectedSchedules]);

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2
        }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <RejectedIcon color="error" />
              <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Programe Respinse
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Programele care au fost respinse și necesită revizuire
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            size={isMobile ? 'small' : 'medium'}
          >
            Reîmprospătează
          </Button>
        </Box>

        {/* Stats Card */}
        <Card sx={{
          bgcolor: 'error.lighter',
          border: '1px solid',
          borderColor: 'error.light',
        }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                <RejectedIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" color="error.main" fontWeight="bold">
                  {rejectedSchedules.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Programe respinse total
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert severity="error">
            Eroare la încărcarea programelor respinse.
          </Alert>
        )}

        {/* Lista programelor respinse */}
        {rejectedSchedules.length === 0 ? (
          <Alert severity="success" icon={<RejectedIcon />}>
            Nu există programe respinse.
          </Alert>
        ) : (
          Object.entries(groupedSchedules)
            .sort(([a], [b]) => b.localeCompare(a)) // Sortează descrescător după lună
            .map(([monthYear, schedules]) => (
              <Paper key={monthYear} sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <CalendarIcon color="action" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formatMonthYear(monthYear)}
                  </Typography>
                  <Chip label={`${schedules.length} programe`} size="small" color="error" />
                </Stack>

                <Stack spacing={2}>
                  {schedules.map((schedule) => {
                    // Găsește utilizatorii din asignări
                    const assignedUserIds = new Set(
                      schedule.assignments?.map(a => a.userId) || []
                    );
                    const assignedUsers = Array.from(assignedUserIds)
                      .map(id => usersMap[id])
                      .filter(Boolean);

                    return (
                      <Card
                        key={schedule.id}
                        variant="outlined"
                        sx={{
                          borderColor: 'error.light',
                          '&:hover': { boxShadow: 2 },
                        }}
                      >
                        <CardContent>
                          <Stack spacing={2}>
                            {/* Header */}
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              justifyContent="space-between"
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                              spacing={1}
                            >
                              <Box>
                                <Typography variant="subtitle1" fontWeight="medium">
                                  {schedule.name || `Program ${formatMonthYear(monthYear)}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Creat la: {new Date(schedule.createdAt).toLocaleDateString('ro-RO')}
                                </Typography>
                              </Box>
                              <Chip
                                icon={<RejectedIcon />}
                                label="Respins"
                                color="error"
                                size="small"
                              />
                            </Stack>

                            {/* Motivul respingerii */}
                            {schedule.rejectionReason && (
                              <Alert severity="error" sx={{ py: 0.5 }}>
                                <Typography variant="body2" fontWeight="medium">
                                  Motiv respingere:
                                </Typography>
                                <Typography variant="body2">
                                  {schedule.rejectionReason}
                                </Typography>
                              </Alert>
                            )}

                            {/* Utilizatori afectați */}
                            {assignedUsers.length > 0 && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" gutterBottom>
                                  Angajați în program:
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                  {assignedUsers.slice(0, 5).map(user => (
                                    <Chip
                                      key={user.id}
                                      icon={<PersonIcon />}
                                      label={user.fullName}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ))}
                                  {assignedUsers.length > 5 && (
                                    <Chip
                                      label={`+${assignedUsers.length - 5} alții`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                </Stack>
                              </Box>
                            )}

                            {/* Acțiuni */}
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => navigate(`/schedules/${schedule.id}`)}
                              >
                                Editează și Retrimite
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </Paper>
            ))
        )}
      </Stack>
    </Box>
  );
};

export default RejectedSchedulesPage;
