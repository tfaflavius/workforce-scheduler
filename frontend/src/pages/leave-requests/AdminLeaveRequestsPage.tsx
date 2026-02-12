import { useState, useMemo } from 'react';
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
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  useTheme,
  useMediaQuery,
  Tooltip,
  IconButton,
  alpha,
  Grid,
} from '@mui/material';
import {
  BeachAccess as BeachIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Warning as WarningIcon,
  LocalHospital as MedicalIcon,
  Cake as BirthdayIcon,
  Star as SpecialIcon,
  EventAvailable as ExtraDaysIcon,
  Person as PersonIcon,
  Business as DepartmentIcon,
  HourglassEmpty as PendingIcon,
  AdminPanelSettings as AdminIcon,
  EventBusy as EventBusyIcon,
} from '@mui/icons-material';
import { GradientHeader, StatCard, EmptyState } from '../../components/common';
import {
  useGetAllLeaveRequestsQuery,
  useRespondToLeaveRequestMutation,
  useLazyCheckOverlapsQuery,
} from '../../store/api/leaveRequests.api';
import type {
  LeaveRequest,
  LeaveType,
  LeaveRequestStatus,
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
    month: 'short',
    year: 'numeric',
  });
};

const calculateDays = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }

  return count || 1;
};

export const AdminLeaveRequestsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tabValue, setTabValue] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseType, setResponseType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [message, setMessage] = useState('');
  const [overlaps, setOverlaps] = useState<LeaveRequest[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: allRequests = [], isLoading } = useGetAllLeaveRequestsQuery();
  const [respond, { isLoading: responding }] = useRespondToLeaveRequestMutation();
  const [checkOverlaps] = useLazyCheckOverlapsQuery();

  const pendingRequests = useMemo(
    () => allRequests.filter((r) => r.status === 'PENDING'),
    [allRequests]
  );
  const approvedRequests = useMemo(
    () => allRequests.filter((r) => r.status === 'APPROVED'),
    [allRequests]
  );
  const rejectedRequests = useMemo(
    () => allRequests.filter((r) => r.status === 'REJECTED'),
    [allRequests]
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = async (request: LeaveRequest, type: 'APPROVED' | 'REJECTED') => {
    setSelectedRequest(request);
    setResponseType(type);
    setMessage('');
    setDialogOpen(true);

    // Check for overlaps
    try {
      const result = await checkOverlaps(request.id).unwrap();
      setOverlaps(result);
    } catch {
      setOverlaps([]);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRequest(null);
    setOverlaps([]);
  };

  const handleSubmit = async () => {
    if (!selectedRequest) return;

    try {
      await respond({
        id: selectedRequest.id,
        data: {
          status: responseType,
          message: message || undefined,
        },
      }).unwrap();
      handleCloseDialog();
      setSuccessMessage(
        responseType === 'APPROVED'
          ? 'Cererea a fost aprobată cu succes!'
          : 'Cererea a fost respinsă.'
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const errorMsg = err && typeof err === 'object' && 'data' in err
        ? (err.data as { message?: string })?.message || 'A apărut o eroare la procesarea cererii.'
        : 'A apărut o eroare la procesarea cererii.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const getDisplayedRequests = () => {
    switch (tabValue) {
      case 0:
        return pendingRequests;
      case 1:
        return approvedRequests;
      case 2:
        return rejectedRequests;
      default:
        return [];
    }
  };

  const displayedRequests = getDisplayedRequests();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with Gradient */}
      <GradientHeader
        title="Gestionare Concedii"
        subtitle="Aprobă sau respinge cererile de concediu ale angajaților"
        icon={<AdminIcon />}
        gradient="#10b981 0%, #059669 100%"
      >
        <Chip
          icon={<BeachIcon sx={{ fontSize: 16 }} />}
          label={`${allRequests.length} total`}
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          size="small"
        />
        {pendingRequests.length > 0 && (
          <Chip
            icon={<PendingIcon sx={{ fontSize: 16 }} />}
            label={`${pendingRequests.length} de procesat`}
            sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white', fontWeight: 600 }}
            size="small"
          />
        )}
      </GradientHeader>

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

      {/* Summary Cards with StatCard */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard
            title="În Așteptare"
            value={pendingRequests.length}
            subtitle={pendingRequests.length > 0 ? 'Necesită acțiune' : undefined}
            icon={<PendingIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#f59e0b' }} />}
            color="#f59e0b"
            bgColor={alpha('#f59e0b', 0.12)}
            delay={0}
            urgent={pendingRequests.length > 0}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard
            title="Aprobate"
            value={approvedRequests.length}
            icon={<ApproveIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#10b981' }} />}
            color="#10b981"
            bgColor={alpha('#10b981', 0.12)}
            delay={100}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard
            title="Respinse"
            value={rejectedRequests.length}
            icon={<RejectIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#ef4444' }} />}
            color="#ef4444"
            bgColor={alpha('#ef4444', 0.12)}
            delay={200}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        sx={{ mb: 3 }}
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        <Tab
          label={
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <span>{isMobile ? 'Așteaptă' : 'Așteaptă Aprobare'}</span>
              {pendingRequests.length > 0 && (
                <Chip label={pendingRequests.length} size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Stack>
          }
        />
        <Tab
          label={
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <span>Aprobate</span>
              {approvedRequests.length > 0 && (
                <Chip label={approvedRequests.length} size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Stack>
          }
        />
        <Tab
          label={
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <span>Respinse</span>
              {rejectedRequests.length > 0 && (
                <Chip label={rejectedRequests.length} size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Stack>
          }
        />
      </Tabs>

      {/* Requests List */}
      {displayedRequests.length === 0 ? (
        <EmptyState
          icon={<EventBusyIcon sx={{ fontSize: 64, color: tabValue === 0 ? '#f59e0b' : tabValue === 1 ? '#10b981' : '#ef4444' }} />}
          title={tabValue === 0 ? 'Nicio cerere în așteptare' : tabValue === 1 ? 'Nicio cerere aprobată' : 'Nicio cerere respinsă'}
          description={tabValue === 0 ? 'Nu ai cereri de concediu de procesat momentan.' : 'Nu există cereri în această categorie.'}
        />
      ) : (
        <Stack spacing={2}>
          {displayedRequests.map((request) => (
            <Card key={request.id}>
              <CardContent>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  spacing={2}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'primary.lighter',
                        color: 'primary.main',
                        flexShrink: 0,
                      }}
                    >
                      {getLeaveTypeIcon(request.leaveType)}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {LEAVE_TYPE_LABELS[request.leaveType]}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                        <Chip
                          icon={<PersonIcon />}
                          label={request.user?.fullName || 'N/A'}
                          size="small"
                          variant="outlined"
                        />
                        {request.user?.department && (
                          <Chip
                            icon={<DepartmentIcon />}
                            label={request.user.department.name}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {formatDate(request.startDate)} - {formatDate(request.endDate)} ({calculateDays(request.startDate, request.endDate)} zile)
                      </Typography>
                      {request.reason && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          Motiv: {request.reason}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} alignItems="center" flexShrink={0}>
                    {request.status === 'PENDING' ? (
                      <>
                        <Tooltip title="Aprobă">
                          <IconButton
                            color="success"
                            onClick={() => handleOpenDialog(request, 'APPROVED')}
                            sx={{ minWidth: 44, minHeight: 44 }}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Respinge">
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDialog(request, 'REJECTED')}
                            sx={{ minWidth: 44, minHeight: 44 }}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <Chip
                        label={LEAVE_STATUS_LABELS[request.status]}
                        color={getStatusColor(request.status)}
                        size="small"
                      />
                    )}
                  </Stack>
                </Stack>

                {request.adminMessage && (
                  <Alert
                    severity={request.status === 'APPROVED' ? 'success' : 'error'}
                    sx={{ mt: 2 }}
                  >
                    <Typography variant="body2">
                      <strong>Mesaj:</strong> {request.adminMessage}
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Response Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            {responseType === 'APPROVED' ? (
              <ApproveIcon color="success" />
            ) : (
              <RejectIcon color="error" />
            )}
            <span>
              {responseType === 'APPROVED' ? 'Aprobă' : 'Respinge'} Cererea
            </span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {selectedRequest && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Detalii Cerere:
                </Typography>
                <Typography variant="body2">
                  <strong>Angajat:</strong> {selectedRequest.user?.fullName}
                </Typography>
                <Typography variant="body2">
                  <strong>Tip:</strong> {LEAVE_TYPE_LABELS[selectedRequest.leaveType]}
                </Typography>
                <Typography variant="body2">
                  <strong>Perioadă:</strong> {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}
                </Typography>
                <Typography variant="body2">
                  <strong>Zile:</strong> {calculateDays(selectedRequest.startDate, selectedRequest.endDate)}
                </Typography>
              </Paper>
            )}

            {overlaps.length > 0 && (
              <Alert severity="warning" icon={<WarningIcon />}>
                <Typography variant="subtitle2" gutterBottom>
                  ⚠️ Suprapuneri în departament:
                </Typography>
                {overlaps.map((overlap) => (
                  <Typography key={overlap.id} variant="body2">
                    • {overlap.user?.fullName}: {formatDate(overlap.startDate)} - {formatDate(overlap.endDate)} ({LEAVE_TYPE_LABELS[overlap.leaveType]})
                  </Typography>
                ))}
              </Alert>
            )}

            <TextField
              label={responseType === 'APPROVED' ? 'Mesaj (opțional)' : 'Motivul respingerii'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
              rows={3}
              fullWidth
              helperText={
                responseType === 'APPROVED'
                  ? 'Poți adăuga un mesaj pentru angajat'
                  : 'Explică de ce cererea a fost respinsă'
              }
            />

            {responseType === 'APPROVED' && (
              <Alert severity="info">
                La aprobare, concediul va fi adăugat automat în programul de lucru al angajatului.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Anulează</Button>
          <Button
            variant="contained"
            color={responseType === 'APPROVED' ? 'success' : 'error'}
            onClick={handleSubmit}
            disabled={responding}
            startIcon={
              responding ? (
                <CircularProgress size={20} />
              ) : responseType === 'APPROVED' ? (
                <ApproveIcon />
              ) : (
                <RejectIcon />
              )
            }
          >
            {responseType === 'APPROVED' ? 'Aprobă' : 'Respinge'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminLeaveRequestsPage;
