import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  CalendarMonth as CalendarIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Business as DepartmentIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import {
  useGetSchedulesQuery,
  useApproveScheduleMutation,
  useRejectScheduleMutation,
} from '../../store/api/schedulesApi';
import type { WorkSchedule } from '../../types/schedule.types';

const PendingSchedulesPage = () => {
  const navigate = useNavigate();

  const { data: pendingSchedules, isLoading, refetch } = useGetSchedulesQuery({
    status: 'PENDING_APPROVAL',
  });

  const [approveSchedule, { isLoading: approving }] = useApproveScheduleMutation();
  const [rejectSchedule, { isLoading: rejecting }] = useRejectScheduleMutation();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApprove = async (schedule: WorkSchedule) => {
    try {
      setError(null);
      await approveSchedule({ id: schedule.id }).unwrap();
      setSuccess(`Programul "${schedule.name}" a fost aprobat cu succes!`);
      refetch();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.data?.message || 'Eroare la aprobarea programului');
    }
  };

  const openRejectDialog = (schedule: WorkSchedule) => {
    setSelectedSchedule(schedule);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedSchedule || !rejectReason.trim()) return;

    try {
      setError(null);
      await rejectSchedule({
        id: selectedSchedule.id,
        data: { reason: rejectReason },
      }).unwrap();
      setSuccess(`Programul "${selectedSchedule.name}" a fost respins.`);
      setRejectDialogOpen(false);
      setSelectedSchedule(null);
      setRejectReason('');
      refetch();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.data?.message || 'Eroare la respingerea programului');
    }
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
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          gutterBottom
          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
        >
          Aprobări Programe
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          Revizuiește și aprobă programele trimise de manageri
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Stats Card */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
          border: '1px solid #ffb74d'
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
          >
            <Box
              sx={{
                width: { xs: 56, sm: 64 },
                height: { xs: 56, sm: 64 },
                borderRadius: 2,
                bgcolor: '#ff9800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarIcon sx={{ color: 'white', fontSize: { xs: 28, sm: 32 } }} />
            </Box>
            <Box>
              <Typography
                variant="h3"
                fontWeight="bold"
                sx={{
                  color: '#e65100',
                  fontSize: { xs: '2rem', sm: '2.5rem' },
                  lineHeight: 1
                }}
              >
                {pendingSchedules?.length || 0}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#bf360c',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                Programe în așteptare
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Lista de programe */}
      {pendingSchedules && pendingSchedules.length > 0 ? (
        <Stack spacing={3}>
          {pendingSchedules.map((schedule: WorkSchedule) => (
            <Card
              key={schedule.id}
              sx={{
                boxShadow: 3,
                '&:hover': { boxShadow: 6 },
                transition: 'box-shadow 0.3s'
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                {/* Titlu program */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 2.5 }}
                >
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                  >
                    {schedule.name}
                  </Typography>
                  {schedule.laborLawValidation?.isValid === false ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: '#ffebee',
                        color: '#c62828',
                        px: 2,
                        py: 0.75,
                        borderRadius: 2,
                      }}
                    >
                      <WarningIcon fontSize="small" />
                      <Typography variant="body2" fontWeight="medium">
                        Probleme
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: '#e8f5e9',
                        color: '#2e7d32',
                        px: 2,
                        py: 0.75,
                        borderRadius: 2,
                      }}
                    >
                      <ApproveIcon fontSize="small" />
                      <Typography variant="body2" fontWeight="medium">
                        Valid
                      </Typography>
                    </Box>
                  )}
                </Stack>

                <Divider sx={{ mb: 2.5 }} />

                {/* Detalii program - Grid mare și clar */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: { xs: 2, sm: 3 },
                    mb: 3,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <ScheduleIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Perioada
                      </Typography>
                      <Typography variant="body1" fontWeight="medium" sx={{ fontSize: '1.1rem' }}>
                        {schedule.month}/{schedule.year}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <PersonIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Creat de
                      </Typography>
                      <Typography variant="body1" fontWeight="medium" sx={{ fontSize: '1.1rem' }}>
                        {schedule.creator?.fullName || 'N/A'}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <DepartmentIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Departament
                      </Typography>
                      <Typography variant="body1" fontWeight="medium" sx={{ fontSize: '1.1rem' }}>
                        {schedule.department?.name || 'General'}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CalendarIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Data trimiterii
                      </Typography>
                      <Typography variant="body1" fontWeight="medium" sx={{ fontSize: '1.1rem' }}>
                        {new Date(schedule.updatedAt).toLocaleDateString('ro-RO')}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Butoane acțiuni - Mari și clare */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                >
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    onClick={() => navigate(`/schedules/${schedule.id}`)}
                    startIcon={<ViewIcon />}
                    sx={{
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    Vezi Detalii
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    fullWidth
                    onClick={() => handleApprove(schedule)}
                    disabled={approving}
                    startIcon={approving ? <CircularProgress size={20} color="inherit" /> : <ApproveIcon />}
                    sx={{
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    Aprobă
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="large"
                    fullWidth
                    onClick={() => openRejectDialog(schedule)}
                    disabled={rejecting}
                    startIcon={<RejectIcon />}
                    sx={{
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    Respinge
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Paper sx={{ p: { xs: 5, sm: 8 }, textAlign: 'center' }}>
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: '#e8f5e9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <ApproveIcon sx={{ fontSize: 50, color: '#4caf50' }} />
          </Box>
          <Typography
            variant="h5"
            gutterBottom
            fontWeight="bold"
            sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
          >
            Totul este la zi!
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}
          >
            Nu există programe care necesită aprobare.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/schedules')}
            sx={{ px: 4, py: 1.5, fontSize: '1rem' }}
          >
            Vezi Toate Programele
          </Button>
        </Paper>
      )}

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          Respinge Programul
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Ești sigur că vrei să respingi programul "{selectedSchedule?.name}"?
            Te rugăm să specifici motivul respingerii.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            label="Motivul respingerii"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Descrie motivul pentru care programul nu poate fi aprobat..."
            error={rejectReason.trim() === '' && rejectDialogOpen}
            helperText={rejectReason.trim() === '' ? 'Motivul este obligatoriu' : ''}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setRejectDialogOpen(false)}
            size="large"
          >
            Anulează
          </Button>
          <Button
            variant="contained"
            color="error"
            size="large"
            onClick={handleReject}
            disabled={!rejectReason.trim() || rejecting}
            startIcon={rejecting ? <CircularProgress size={20} color="inherit" /> : <RejectIcon />}
          >
            Respinge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingSchedulesPage;
