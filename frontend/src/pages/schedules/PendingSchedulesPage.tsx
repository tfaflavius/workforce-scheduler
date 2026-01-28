import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
  Avatar,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Warning as WarningIcon,
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
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Aprobări Programe
        </Typography>
        <Typography variant="body1" color="text.secondary">
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

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'warning.light', width: 56, height: 56 }}>
                  <CalendarIcon sx={{ color: 'warning.dark' }} />
                </Avatar>
                <Box>
                  <Typography variant="h3" fontWeight="bold" color="warning.main">
                    {pendingSchedules?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Programe în așteptare
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Schedules Table */}
      {pendingSchedules && pendingSchedules.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Program</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Lună/An</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Creat de</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Departament</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Data trimiterii</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Validare</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">
                  Acțiuni
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingSchedules.map((schedule: WorkSchedule) => (
                <TableRow
                  key={schedule.id}
                  hover
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                    cursor: 'pointer',
                  }}
                >
                  <TableCell onClick={() => navigate(`/schedules/${schedule.id}`)}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ bgcolor: 'warning.light' }}>
                        <CalendarIcon sx={{ color: 'warning.dark' }} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {schedule.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {schedule.assignments?.length || 0} alocări
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${schedule.month}/${schedule.year}`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <PersonIcon fontSize="small" color="action" />
                      <Box>
                        <Typography variant="body2">
                          {schedule.creator?.fullName || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {schedule.creator?.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {schedule.department?.name || 'General'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TimeIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {new Date(schedule.updatedAt).toLocaleDateString('ro-RO')}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {schedule.laborLawValidation?.isValid === false ? (
                      <Tooltip title="Există încălcări ale legislației muncii">
                        <Chip
                          icon={<WarningIcon />}
                          label="Probleme"
                          size="small"
                          color="error"
                        />
                      </Tooltip>
                    ) : (
                      <Chip label="Valid" size="small" color="success" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Vezi detalii">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/schedules/${schedule.id}`)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Aprobă">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleApprove(schedule)}
                          disabled={approving}
                        >
                          <ApproveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Respinge">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openRejectDialog(schedule)}
                          disabled={rejecting}
                        >
                          <RejectIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CalendarIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Nu există programe în așteptare
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Toate programele au fost procesate. Revino mai târziu.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/schedules')}>
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
        <DialogTitle>
          Respinge Programul
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>
            Anulează
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!rejectReason.trim() || rejecting}
            startIcon={rejecting ? <CircularProgress size={16} /> : <RejectIcon />}
          >
            Respinge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingSchedulesPage;
