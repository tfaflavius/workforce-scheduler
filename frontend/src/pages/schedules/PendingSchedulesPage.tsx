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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  CalendarMonth as CalendarIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  useGetSchedulesQuery,
  useApproveScheduleMutation,
  useRejectScheduleMutation,
} from '../../store/api/schedulesApi';
import type { WorkSchedule } from '../../types/schedule.types';

const PendingSchedulesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          gutterBottom
          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' } }}
        >
          Aprobări Programe
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
          Revizuiește și aprobă programele trimise de manageri
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: { xs: 2, sm: 3 } }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: { xs: 2, sm: 3 } }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Stats Card */}
      <Card sx={{ mb: { xs: 2, sm: 3, md: 4 }, maxWidth: { xs: '100%', sm: 320 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              sx={{
                bgcolor: '#fff3e0',
                width: { xs: 48, sm: 56 },
                height: { xs: 48, sm: 56 }
              }}
            >
              <CalendarIcon sx={{ color: '#ed6c02', fontSize: { xs: 24, sm: 28 } }} />
            </Avatar>
            <Box>
              <Typography
                variant="h3"
                fontWeight="bold"
                sx={{
                  color: '#ed6c02',
                  fontSize: { xs: '1.75rem', sm: '2.25rem' },
                  lineHeight: 1.2
                }}
              >
                {pendingSchedules?.length || 0}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                Programe în așteptare
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Pending Schedules - Mobile Card View / Desktop Table View */}
      {pendingSchedules && pendingSchedules.length > 0 ? (
        isMobile ? (
          // Mobile Card View
          <Stack spacing={2}>
            {pendingSchedules.map((schedule: WorkSchedule) => (
              <Card key={schedule.id}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={2}>
                    {/* Header */}
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ bgcolor: 'warning.light', width: 40, height: 40 }}>
                        <CalendarIcon sx={{ color: 'warning.dark', fontSize: 20 }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight="medium" noWrap>
                          {schedule.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {schedule.month}/{schedule.year} • {schedule.assignments?.length || 0} alocări
                        </Typography>
                      </Box>
                      {schedule.laborLawValidation?.isValid === false ? (
                        <Chip icon={<WarningIcon />} label="!" size="small" color="error" />
                      ) : (
                        <Chip label="✓" size="small" color="success" />
                      )}
                    </Stack>

                    {/* Details */}
                    <Box sx={{ pl: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Creat de: {schedule.creator?.fullName || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Departament: {schedule.department?.name || 'General'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Trimis: {new Date(schedule.updatedAt).toLocaleDateString('ro-RO')}
                      </Typography>
                    </Box>

                    {/* Actions - Full width buttons */}
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={() => navigate(`/schedules/${schedule.id}`)}
                        startIcon={<ViewIcon />}
                        sx={{ flex: 1 }}
                      >
                        Detalii
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        fullWidth
                        onClick={() => handleApprove(schedule)}
                        disabled={approving}
                        startIcon={<ApproveIcon />}
                        sx={{ flex: 1 }}
                      >
                        Aprobă
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        fullWidth
                        onClick={() => openRejectDialog(schedule)}
                        disabled={rejecting}
                        startIcon={<RejectIcon />}
                        sx={{ flex: 1 }}
                      >
                        Respinge
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          // Desktop Table View
          <TableContainer component={Paper}>
            <Table size="small">
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
                        <Avatar sx={{ bgcolor: 'warning.light', width: 36, height: 36 }}>
                          <CalendarIcon sx={{ color: 'warning.dark', fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
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
                      <Typography variant="body2">
                        {schedule.creator?.fullName || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {schedule.department?.name || 'General'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(schedule.updatedAt).toLocaleDateString('ro-RO')}
                      </Typography>
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
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Vezi detalii">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/schedules/${schedule.id}`)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Aprobă">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(schedule)}
                            disabled={approving}
                          >
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Respinge">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openRejectDialog(schedule)}
                            disabled={rejecting}
                          >
                            <RejectIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        <Paper sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center' }}>
          <CalendarIcon sx={{ fontSize: { xs: 48, sm: 64 }, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Nu există programe în așteptare
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Toate programele au fost procesate.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/schedules')} size={isMobile ? 'small' : 'medium'}>
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
