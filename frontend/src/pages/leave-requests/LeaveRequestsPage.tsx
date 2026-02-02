import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Paper,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  BeachAccess as BeachIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as PendingIcon,
  LocalHospital as MedicalIcon,
  Cake as BirthdayIcon,
  Star as SpecialIcon,
  EventAvailable as ExtraDaysIcon,
} from '@mui/icons-material';
import {
  useGetMyLeaveRequestsQuery,
  useGetMyLeaveBalanceQuery,
  useCreateLeaveRequestMutation,
  useCancelLeaveRequestMutation,
} from '../../store/api/leaveRequests.api';
import { useAppSelector } from '../../store/hooks';
import type {
  LeaveType,
  LeaveRequestStatus,
  CreateLeaveRequestDto,
} from '../../types/leave-request.types';
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '../../types/leave-request.types';

const getStatusColor = (status: LeaveRequestStatus) => {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'error';
    case 'PENDING':
    default:
      return 'warning';
  }
};

const getStatusIcon = (status: LeaveRequestStatus) => {
  switch (status) {
    case 'APPROVED':
      return <CheckCircleIcon fontSize="small" />;
    case 'REJECTED':
      return <CancelIcon fontSize="small" />;
    case 'PENDING':
    default:
      return <PendingIcon fontSize="small" />;
  }
};

const getLeaveTypeIcon = (type: LeaveType) => {
  switch (type) {
    case 'MEDICAL':
      return <MedicalIcon />;
    case 'BIRTHDAY':
      return <BirthdayIcon />;
    case 'SPECIAL':
      return <SpecialIcon />;
    case 'EXTRA_DAYS':
      return <ExtraDaysIcon />;
    case 'VACATION':
    default:
      return <BeachIcon />;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const LeaveRequestsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAppSelector((state) => state.auth);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('VACATION');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: requests = [], isLoading: loadingRequests } = useGetMyLeaveRequestsQuery();
  const { data: balances = [], isLoading: loadingBalance } = useGetMyLeaveBalanceQuery();
  const [createRequest, { isLoading: creating, error: createError }] = useCreateLeaveRequestMutation();
  const [cancelRequest, { isLoading: canceling }] = useCancelLeaveRequestMutation();

  const handleOpenDialog = () => {
    setLeaveType('VACATION');
    setStartDate('');
    setEndDate('');
    setReason('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate) return;

    const dto: CreateLeaveRequestDto = {
      leaveType,
      startDate,
      endDate,
      reason: reason || undefined,
    };

    try {
      await createRequest(dto).unwrap();
      handleCloseDialog();
    } catch (err) {
      // Error is handled by RTK Query
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Ești sigur că vrei să anulezi această cerere?')) {
      try {
        await cancelRequest(id).unwrap();
      } catch (err) {
        // Error handled by RTK Query
      }
    }
  };

  const getErrorMessage = (error: any): string => {
    if (error?.data?.message) {
      return error.data.message;
    }
    return 'A apărut o eroare. Încearcă din nou.';
  };

  // Check if user has birthDate set (needed for BIRTHDAY leave)
  const hasBirthDate = !!(user as any)?.birthDate;

  const leaveTypeOptions: { value: LeaveType; label: string; disabled?: boolean }[] = [
    { value: 'VACATION', label: LEAVE_TYPE_LABELS.VACATION },
    { value: 'MEDICAL', label: LEAVE_TYPE_LABELS.MEDICAL },
    { value: 'BIRTHDAY', label: LEAVE_TYPE_LABELS.BIRTHDAY, disabled: !hasBirthDate },
    { value: 'SPECIAL', label: LEAVE_TYPE_LABELS.SPECIAL },
    { value: 'EXTRA_DAYS', label: LEAVE_TYPE_LABELS.EXTRA_DAYS },
  ];

  if (loadingRequests || loadingBalance) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Concedii
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Solicită și gestionează cererile tale de concediu
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Cerere Nouă
        </Button>
      </Stack>

      {/* Balance Cards */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Zile Disponibile ({new Date().getFullYear()})
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {balances.map((balance) => (
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={balance.id}>
            <Paper
              sx={{
                p: 2,
                textAlign: 'center',
                bgcolor: balance.totalDays - balance.usedDays > 0 ? 'success.lighter' : 'grey.100',
              }}
            >
              <Box sx={{ mb: 1 }}>{getLeaveTypeIcon(balance.leaveType)}</Box>
              <Typography variant="caption" display="block" noWrap>
                {LEAVE_TYPE_LABELS[balance.leaveType]}
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {balance.totalDays - balance.usedDays}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                din {balance.totalDays} zile
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Requests List */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Cererile Mele
      </Typography>

      {requests.length === 0 ? (
        <Alert severity="info" icon={<BeachIcon />}>
          Nu ai trimis nicio cerere de concediu. Apasă "Cerere Nouă" pentru a solicita concediu.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  spacing={2}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'primary.lighter',
                        color: 'primary.main',
                      }}
                    >
                      {getLeaveTypeIcon(request.leaveType)}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {LEAVE_TYPE_LABELS[request.leaveType]}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </Typography>
                      {request.reason && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Motiv: {request.reason}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      icon={getStatusIcon(request.status)}
                      label={LEAVE_STATUS_LABELS[request.status]}
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                    {request.status === 'PENDING' && (
                      <Tooltip title="Anulează cererea">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleCancel(request.id)}
                          disabled={canceling}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>

                {request.adminMessage && (
                  <Alert
                    severity={request.status === 'APPROVED' ? 'success' : 'error'}
                    sx={{ mt: 2 }}
                  >
                    <Typography variant="body2">
                      <strong>Mesaj de la admin:</strong> {request.adminMessage}
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Create Request Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BeachIcon color="primary" />
            <span>Cerere Nouă de Concediu</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {createError && (
              <Alert severity="error">{getErrorMessage(createError)}</Alert>
            )}

            <TextField
              select
              label="Tip Concediu"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              fullWidth
            >
              {leaveTypeOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {getLeaveTypeIcon(option.value)}
                    <span>{option.label}</span>
                    {option.disabled && (
                      <Typography variant="caption" color="text.secondary">
                        (completează data nașterii în profil)
                      </Typography>
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="date"
              label="Data Început"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              type="date"
              label="Data Sfârșit"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Motiv (opțional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              rows={3}
              fullWidth
              helperText="Explică motivul cererii tale"
            />

            <Alert severity="info">
              <Typography variant="body2">
                {leaveType === 'MEDICAL'
                  ? 'Concediul medical nu necesită aprobare cu 7 zile în avans.'
                  : 'Cererea trebuie făcută cu cel puțin 7 zile înainte de data de început.'}
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Anulează</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!startDate || !endDate || creating}
            startIcon={creating ? <CircularProgress size={20} /> : <BeachIcon />}
          >
            Trimite Cererea
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveRequestsPage;
