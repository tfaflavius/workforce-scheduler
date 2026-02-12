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
  alpha,
  LinearProgress,
  Grow,
} from '@mui/material';
import DatePickerField from '../../components/common/DatePickerField';
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
  EventBusy as EventBusyIcon,
} from '@mui/icons-material';
import { GradientHeader, EmptyState } from '../../components/common';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setSuccessMessage('Cererea de concediu a fost trimisă cu succes!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const errorMsg = err && typeof err === 'object' && 'data' in err
        ? (err.data as { message?: string })?.message || 'A apărut o eroare la crearea cererii.'
        : 'A apărut o eroare la crearea cererii.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Ești sigur că vrei să anulezi această cerere?')) {
      try {
        await cancelRequest(id).unwrap();
        setSuccessMessage('Cererea a fost anulată cu succes.');
        setTimeout(() => setSuccessMessage(null), 5000);
      } catch (err: unknown) {
        const errorMsg = err && typeof err === 'object' && 'data' in err
          ? (err.data as { message?: string })?.message || 'A apărut o eroare la anularea cererii.'
          : 'A apărut o eroare la anularea cererii.';
        setErrorMessage(errorMsg);
        setTimeout(() => setErrorMessage(null), 5000);
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

  // Statistics
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const totalDaysAvailable = balances.reduce((sum, b) => sum + (b.totalDays - b.usedDays), 0);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with Gradient */}
      <GradientHeader
        title="Concediile Mele"
        subtitle="Solicită și gestionează cererile tale de concediu"
        icon={<BeachIcon />}
        gradient="#10b981 0%, #059669 100%"
      >
        <Chip
          icon={<BeachIcon sx={{ fontSize: 16 }} />}
          label={`${totalDaysAvailable} zile disponibile`}
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          size="small"
        />
        {pendingCount > 0 && (
          <Chip
            icon={<PendingIcon sx={{ fontSize: 16 }} />}
            label={`${pendingCount} în așteptare`}
            sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white' }}
            size="small"
          />
        )}
      </GradientHeader>

      {/* Action Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
          sx={{
            bgcolor: '#10b981',
            '&:hover': { bgcolor: '#059669' },
          }}
        >
          Cerere Nouă de Concediu
        </Button>
      </Box>

      {/* Error/Success Messages */}
      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* Balance Cards with Progress Bars */}
      <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 600 }}>
        Zile Disponibile ({new Date().getFullYear()})
      </Typography>
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 4 }}>
        {balances.map((balance, index) => {
          // Types without balance limit: VACATION, SPECIAL, EXTRA_DAYS
          const typesWithoutLimit: LeaveType[] = ['VACATION', 'SPECIAL', 'EXTRA_DAYS'];
          const hasNoLimit = typesWithoutLimit.includes(balance.leaveType);

          const remaining = balance.totalDays - balance.usedDays;
          const usedPercentage = hasNoLimit ? 0 : (balance.usedDays / balance.totalDays) * 100;
          const isLow = !hasNoLimit && remaining <= balance.totalDays * 0.2 && remaining > 0;
          const isEmpty = !hasNoLimit && remaining === 0;

          return (
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={balance.id}>
              <Grow in={true} timeout={500 + index * 100}>
                <Paper
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    textAlign: 'center',
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[4],
                    },
                  }}
                >
                  {/* Background decoration */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      bgcolor: isEmpty
                        ? alpha(theme.palette.grey[500], 0.1)
                        : isLow
                          ? alpha('#f59e0b', 0.1)
                          : alpha('#10b981', 0.1),
                    }}
                  />

                  <Box
                    sx={{
                      mb: 1,
                      color: isEmpty
                        ? 'grey.500'
                        : isLow
                          ? '#f59e0b'
                          : '#10b981',
                    }}
                  >
                    {getLeaveTypeIcon(balance.leaveType)}
                  </Box>

                  <Typography
                    variant="caption"
                    display="block"
                    noWrap
                    sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, fontWeight: 600, mb: 0.5 }}
                  >
                    {LEAVE_TYPE_LABELS[balance.leaveType]}
                  </Typography>

                  {hasNoLimit ? (
                    // For types without limit, show only used days
                    <>
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        sx={{
                          fontSize: { xs: '1.5rem', sm: '2rem' },
                          color: '#10b981',
                          lineHeight: 1,
                        }}
                      >
                        {balance.usedDays}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, display: 'block', mb: 1 }}
                      >
                        zile folosite
                      </Typography>

                      <Chip
                        label="Fără limită"
                        size="small"
                        sx={{
                          fontSize: '0.6rem',
                          height: 20,
                          bgcolor: alpha('#10b981', 0.1),
                          color: '#10b981',
                          fontWeight: 600,
                        }}
                      />
                    </>
                  ) : (
                    // For types with limit (BIRTHDAY, MEDICAL), show remaining
                    <>
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        sx={{
                          fontSize: { xs: '1.5rem', sm: '2rem' },
                          color: isEmpty
                            ? 'grey.500'
                            : isLow
                              ? '#f59e0b'
                              : '#10b981',
                          lineHeight: 1,
                        }}
                      >
                        {remaining}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, display: 'block', mb: 1 }}
                      >
                        din {balance.totalDays} zile
                      </Typography>

                      {/* Progress Bar */}
                      <LinearProgress
                        variant="determinate"
                        value={usedPercentage}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(
                            isEmpty ? theme.palette.grey[500] : isLow ? '#f59e0b' : '#10b981',
                            0.15
                          ),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: isEmpty
                              ? 'grey.500'
                              : isLow
                                ? '#f59e0b'
                                : '#10b981',
                          },
                        }}
                      />

                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: { xs: '0.55rem', sm: '0.65rem' },
                          color: 'text.secondary',
                          mt: 0.5,
                          display: 'block',
                        }}
                      >
                        {balance.usedDays} folosite
                      </Typography>
                    </>
                  )}
                </Paper>
              </Grow>
            </Grid>
          );
        })}
      </Grid>

      {/* Requests List */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Cererile Mele
      </Typography>

      {requests.length === 0 ? (
        <EmptyState
          icon={<EventBusyIcon sx={{ fontSize: 64, color: '#10b981' }} />}
          title="Nicio cerere de concediu"
          description="Bucură-te de zilele tale libere! Apasă butonul de mai sus pentru a solicita concediu."
          actionLabel="Solicită Concediu"
          onAction={handleOpenDialog}
        />
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

            <DatePickerField
              label="Data Început"
              value={startDate || null}
              onChange={(value) => setStartDate(value || '')}
              fullWidth
              minDate={new Date().toISOString().split('T')[0]}
            />

            <DatePickerField
              label="Data Sfârșit"
              value={endDate || null}
              onChange={(value) => setEndDate(value || '')}
              fullWidth
              minDate={startDate || new Date().toISOString().split('T')[0]}
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
                  ? 'Concediul medical nu necesită aprobare cu 1 zi în avans.'
                  : 'Cererea trebuie făcută cu cel puțin 1 zi înainte de data de început.'}
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
