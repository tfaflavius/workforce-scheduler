import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
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
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { GradientHeader, StatCard, EmptyState } from '../../components/common';
import {
  useGetAllLeaveRequestsQuery,
  useRespondToLeaveRequestMutation,
  useLazyCheckOverlapsQuery,
  useAdminEditLeaveRequestMutation,
  useAdminDeleteLeaveRequestMutation,
} from '../../store/api/leaveRequests.api';
import type {
  LeaveRequest,
  LeaveType,
  LeaveRequestStatus,
} from '../../types/leave-request.types';
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '../../types/leave-request.types';

const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: 'VACATION', label: 'Concediu de Odihna' },
  { value: 'MEDICAL', label: 'Concediu Medical' },
  { value: 'BIRTHDAY', label: 'Concediu Zi de Nastere' },
  { value: 'SPECIAL', label: 'Concediu Special' },
  { value: 'EXTRA_DAYS', label: 'Zile Suplimentare' },
];

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
  const location = useLocation();
  const highlightRequestId = (location.state as any)?.highlightRequestId as string | undefined;
  const highlightRef = useRef<HTMLDivElement>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [tabValue, setTabValue] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseType, setResponseType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [message, setMessage] = useState('');
  const [overlaps, setOverlaps] = useState<LeaveRequest[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit / Delete state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<LeaveRequest | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<LeaveRequest | null>(null);
  const [editLeaveType, setEditLeaveType] = useState<LeaveType>('VACATION');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editReason, setEditReason] = useState('');

  const { data: allRequests = [], isLoading } = useGetAllLeaveRequestsQuery();
  const [respond, { isLoading: responding }] = useRespondToLeaveRequestMutation();
  const [checkOverlaps] = useLazyCheckOverlapsQuery();
  const [adminEdit, { isLoading: editing }] = useAdminEditLeaveRequestMutation();
  const [adminDelete, { isLoading: deleting }] = useAdminDeleteLeaveRequestMutation();

  // Auto-switch to the correct tab and highlight the request from notification
  useEffect(() => {
    if (highlightRequestId && allRequests.length > 0) {
      const request = allRequests.find((r) => r.id === highlightRequestId);
      if (request) {
        // Switch to the correct tab based on status
        const tabIndex = request.status === 'PENDING' ? 0 : request.status === 'APPROVED' ? 1 : 2;
        setTabValue(tabIndex);
        setHighlightedId(highlightRequestId);

        // Scroll to the element after a short delay (to allow tab switch + render)
        setTimeout(() => {
          highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);

        // Remove highlight after 3 seconds
        setTimeout(() => setHighlightedId(null), 4000);
      }

      // Clear the navigation state so refresh doesn't re-highlight
      window.history.replaceState({}, document.title);
    }
  }, [highlightRequestId, allRequests]);

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
    setDialogError(null);
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

  const [dialogError, setDialogError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedRequest) return;
    setDialogError(null);

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
          ? 'Cererea a fost aprobata cu succes!'
          : 'Cererea a fost respinsa.'
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const errorMsg = err && typeof err === 'object' && 'data' in err
        ? (err.data as { message?: string })?.message || 'A aparut o eroare la procesarea cererii.'
        : 'A aparut o eroare la procesarea cererii.';

      // If the request was already processed (e.g. slow network, user clicked again),
      // treat it as success - close dialog and refresh the list
      if (errorMsg.includes('deja procesata') || errorMsg.includes('already')) {
        handleCloseDialog();
        setSuccessMessage('Cererea a fost deja procesata anterior.');
        setTimeout(() => setSuccessMessage(null), 5000);
        return;
      }

      setDialogError(errorMsg);
    }
  };

  // Edit handlers
  const handleOpenEdit = (request: LeaveRequest) => {
    setEditRequest(request);
    setEditLeaveType(request.leaveType);
    setEditStartDate(new Date(request.startDate).toISOString().split('T')[0]);
    setEditEndDate(new Date(request.endDate).toISOString().split('T')[0]);
    setEditReason(request.reason || '');
    setEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setEditRequest(null);
  };

  const handleSubmitEdit = async () => {
    if (!editRequest) return;
    try {
      await adminEdit({
        id: editRequest.id,
        data: {
          leaveType: editLeaveType,
          startDate: editStartDate,
          endDate: editEndDate,
          reason: editReason || undefined,
        },
      }).unwrap();
      setSuccessMessage('Cererea a fost modificata cu succes!');
      handleCloseEdit();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Eroare la modificarea cererii');
    }
  };

  // Delete handlers
  const handleOpenDelete = (request: LeaveRequest) => {
    setDeleteRequest(request);
    setDeleteDialogOpen(true);
  };

  const handleCloseDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteRequest(null);
  };

  const handleSubmitDelete = async () => {
    if (!deleteRequest) return;
    try {
      await adminDelete(deleteRequest.id).unwrap();
      setSuccessMessage('Cererea a fost stearsa cu succes!');
      handleCloseDelete();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Eroare la stergerea cererii');
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
        subtitle="Aproba sau respinge cererile de concediu ale angajatilor"
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
            title="In Asteptare"
            value={pendingRequests.length}
            subtitle={pendingRequests.length > 0 ? 'Necesita actiune' : undefined}
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
              <span>{isMobile ? 'Asteapta' : 'Asteapta Aprobare'}</span>
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
          title={tabValue === 0 ? 'Nicio cerere in asteptare' : tabValue === 1 ? 'Nicio cerere aprobata' : 'Nicio cerere respinsa'}
          description={tabValue === 0 ? 'Nu ai cereri de concediu de procesat momentan.' : 'Nu exista cereri in aceasta categorie.'}
        />
      ) : (
        <Stack spacing={2}>
          {displayedRequests.map((request) => (
            <Card
              key={request.id}
              ref={request.id === highlightedId ? highlightRef : undefined}
              sx={{
                transition: 'all 0.5s ease',
                ...(request.id === highlightedId && {
                  border: '2px solid',
                  borderColor: 'primary.main',
                  boxShadow: `0 0 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                  animation: 'highlightPulse 1s ease-in-out 3',
                  '@keyframes highlightPulse': {
                    '0%, 100%': { boxShadow: `0 0 8px ${alpha(theme.palette.primary.main, 0.3)}` },
                    '50%': { boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.6)}` },
                  },
                }),
              }}
            >
              <CardContent>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  spacing={2}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 2 }, flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        p: { xs: 1, sm: 1.5 },
                        borderRadius: 2,
                        bgcolor: 'primary.lighter',
                        color: 'primary.main',
                        flexShrink: 0,
                      }}
                    >
                      {getLeaveTypeIcon(request.leaveType)}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium" noWrap>
                        {LEAVE_TYPE_LABELS[request.leaveType]}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                        <Chip
                          icon={<PersonIcon />}
                          label={request.user?.fullName || 'N/A'}
                          size="small"
                          variant="outlined"
                          sx={{ maxWidth: '100%' }}
                        />
                        {request.user?.department && (
                          <Chip
                            icon={<DepartmentIcon />}
                            label={request.user.department.name}
                            size="small"
                            variant="outlined"
                            sx={{ maxWidth: '100%' }}
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }} noWrap>
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

                  <Stack direction="row" spacing={{ xs: 0.5, sm: 0.5 }} alignItems="center" flexShrink={0}>
                    {request.status === 'PENDING' && (
                      <>
                        <Tooltip title="Aproba">
                          <IconButton
                            color="success"
                            onClick={() => handleOpenDialog(request, 'APPROVED')}
                            sx={{ minWidth: 36, minHeight: 36 }}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Respinge">
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDialog(request, 'REJECTED')}
                            sx={{ minWidth: 36, minHeight: 36 }}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {request.status !== 'PENDING' && (
                      <Chip
                        label={LEAVE_STATUS_LABELS[request.status]}
                        color={getStatusColor(request.status)}
                        size="small"
                      />
                    )}
                    <Tooltip title="Editeaza">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenEdit(request)}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sterge">
                      <IconButton
                        color="error"
                        onClick={() => handleOpenDelete(request)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
              {responseType === 'APPROVED' ? 'Aproba' : 'Respinge'} Cererea
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
                  <strong>Perioada:</strong> {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}
                </Typography>
                <Typography variant="body2">
                  <strong>Zile:</strong> {calculateDays(selectedRequest.startDate, selectedRequest.endDate)}
                </Typography>
              </Paper>
            )}

            {overlaps.length > 0 && (
              <Alert severity="warning" icon={<WarningIcon />}>
                <Typography variant="subtitle2" gutterBottom>
                  ⚠️ Suprapuneri in departament:
                </Typography>
                {overlaps.map((overlap) => (
                  <Typography key={overlap.id} variant="body2">
                    • {overlap.user?.fullName}: {formatDate(overlap.startDate)} - {formatDate(overlap.endDate)} ({LEAVE_TYPE_LABELS[overlap.leaveType]})
                  </Typography>
                ))}
              </Alert>
            )}

            {dialogError && (
              <Alert severity="error" onClose={() => setDialogError(null)}>
                {dialogError}
              </Alert>
            )}

            <TextField
              label={responseType === 'APPROVED' ? 'Mesaj (optional)' : 'Motivul respingerii'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
              rows={3}
              fullWidth
              helperText={
                responseType === 'APPROVED'
                  ? 'Poti adauga un mesaj pentru angajat'
                  : 'Explica de ce cererea a fost respinsa'
              }
            />

            {responseType === 'APPROVED' && (
              <Alert severity="info">
                La aprobare, concediul va fi adaugat automat in programul de lucru al angajatului.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Anuleaza</Button>
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
            {responseType === 'APPROVED' ? 'Aproba' : 'Respinge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Leave Request Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEdit}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <EditIcon color="primary" />
            <span>Editeaza Cererea de Concediu</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {editRequest && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Angajat: {editRequest.user?.fullName || 'N/A'}
                </Typography>
                <Chip
                  label={LEAVE_STATUS_LABELS[editRequest.status]}
                  color={getStatusColor(editRequest.status)}
                  size="small"
                />
              </Paper>
            )}

            {editRequest?.status === 'APPROVED' && (
              <Alert severity="warning" icon={<WarningIcon />}>
                Aceasta cerere este <strong>aprobata</strong>. Modificarea va actualiza automat programul de lucru si balanta de zile.
              </Alert>
            )}

            <FormControl fullWidth>
              <InputLabel>Tip Concediu</InputLabel>
              <Select
                value={editLeaveType}
                label="Tip Concediu"
                onChange={(e) => setEditLeaveType(e.target.value as LeaveType)}
              >
                {LEAVE_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Data Inceput"
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="Data Sfarsit"
              type="date"
              value={editEndDate}
              onChange={(e) => setEditEndDate(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {editStartDate && editEndDate && (
              <Typography variant="body2" color="text.secondary">
                Zile lucratoare: <strong>{calculateDays(editStartDate, editEndDate)}</strong>
              </Typography>
            )}

            <TextField
              label="Motiv (optional)"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Anuleaza</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitEdit}
            disabled={editing || !editStartDate || !editEndDate}
            startIcon={editing ? <CircularProgress size={20} /> : <EditIcon />}
          >
            Salveaza
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Leave Request Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DeleteIcon color="error" />
            <span>Sterge Cererea de Concediu</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {deleteRequest && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2">
                  <strong>Angajat:</strong> {deleteRequest.user?.fullName || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Tip:</strong> {LEAVE_TYPE_LABELS[deleteRequest.leaveType]}
                </Typography>
                <Typography variant="body2">
                  <strong>Perioada:</strong> {formatDate(deleteRequest.startDate)} - {formatDate(deleteRequest.endDate)}
                </Typography>
                <Typography variant="body2">
                  <strong>Zile:</strong> {calculateDays(deleteRequest.startDate, deleteRequest.endDate)}
                </Typography>
              </Paper>
            )}

            {deleteRequest?.status === 'APPROVED' && (
              <Alert severity="warning" icon={<WarningIcon />}>
                Aceasta cerere este <strong>aprobata</strong>. Stergerea va reversa automat zilele din balanta si va elimina concediul din programul de lucru.
              </Alert>
            )}

            <Alert severity="error">
              Aceasta actiune este ireversibila. Esti sigur ca vrei sa stergi aceasta cerere?
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Anuleaza</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmitDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            Sterge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminLeaveRequestsPage;
