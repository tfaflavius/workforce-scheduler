import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Stack,
  Chip,
  Button,
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  Grid,
} from '@mui/material';
import {
  SwapHoriz as SwapIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  Info as InfoIcon,
  Cancel as CancelIcon,
  HourglassEmpty as PendingIcon,
  CheckCircle as ApprovedIcon,
  Error as RejectedIcon,
  Visibility as ViewIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { GradientHeader, StatCard } from '../../components/common';
import {
  useGetAllSwapRequestsQuery,
  useApproveSwapRequestMutation,
  useRejectSwapRequestMutation,
} from '../../store/api/shiftSwaps.api';
import type { ShiftSwapRequest, ShiftSwapStatus } from '../../types/shift-swap.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const getStatusColor = (status: ShiftSwapStatus) => {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'AWAITING_ADMIN':
      return 'info';
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'error';
    case 'CANCELLED':
      return 'default';
    case 'EXPIRED':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: ShiftSwapStatus) => {
  switch (status) {
    case 'PENDING':
      return 'În așteptare răspuns';
    case 'AWAITING_ADMIN':
      return 'Așteaptă aprobare';
    case 'APPROVED':
      return 'Aprobat';
    case 'REJECTED':
      return 'Respins';
    case 'CANCELLED':
      return 'Anulat';
    case 'EXPIRED':
      return 'Expirat';
    default:
      return status;
  }
};

const getStatusIcon = (status: ShiftSwapStatus) => {
  switch (status) {
    case 'PENDING':
      return <PendingIcon />;
    case 'AWAITING_ADMIN':
      return <TimeIcon />;
    case 'APPROVED':
      return <ApprovedIcon />;
    case 'REJECTED':
      return <RejectedIcon />;
    case 'CANCELLED':
      return <CancelIcon />;
    case 'EXPIRED':
      return <CancelIcon />;
    default:
      return <InfoIcon />;
  }
};

const AdminShiftSwapsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tabValue, setTabValue] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<ShiftSwapRequest | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // API calls
  const { data: allRequests = [], isLoading } = useGetAllSwapRequestsQuery({});
  const [approveSwap, { isLoading: approving }] = useApproveSwapRequestMutation();
  const [rejectSwap, { isLoading: rejecting }] = useRejectSwapRequestMutation();

  // Filter requests by status
  const awaitingAdminRequests = allRequests.filter((r) => r.status === 'AWAITING_ADMIN');
  const pendingRequests = allRequests.filter((r) => r.status === 'PENDING');
  const completedRequests = allRequests.filter((r) => ['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(r.status));

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenDetails = (request: ShiftSwapRequest) => {
    setSelectedRequest(request);
    setDetailsDialogOpen(true);
  };

  const handleOpenActionDialog = (request: ShiftSwapRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes('');
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRequest) return;

    try {
      if (actionType === 'approve') {
        // Find the responder who accepted
        const acceptedResponse = selectedRequest.responses?.find((r) => r.response === 'ACCEPTED');
        if (!acceptedResponse) {
          console.error('No accepted response found');
          return;
        }
        await approveSwap({
          id: selectedRequest.id,
          data: {
            approvedResponderId: acceptedResponse.responderId,
            adminNotes: adminNotes || undefined,
          },
        }).unwrap();
      } else {
        await rejectSwap({
          id: selectedRequest.id,
          data: { adminNotes: adminNotes || 'Respins de administrator' },
        }).unwrap();
      }
      setActionDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');
      setSuccessMessage(actionType === 'approve' ? 'Schimbul de tură a fost aprobat cu succes!' : 'Cererea a fost respinsă.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: unknown) {
      console.error('Error processing swap request:', error);
      const errorMsg = error && typeof error === 'object' && 'data' in error
        ? (error.data as { message?: string })?.message || 'A apărut o eroare la procesarea cererii.'
        : 'A apărut o eroare la procesarea cererii.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ro-RO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderRequestCard = (request: ShiftSwapRequest) => {
    const acceptedResponse = request.responses?.find((r) => r.response === 'ACCEPTED');

    return (
      <Card key={request.id} sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
                <Chip
                  icon={getStatusIcon(request.status)}
                  label={getStatusLabel(request.status)}
                  color={getStatusColor(request.status)}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  #{request.id.substring(0, 8)}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <CalendarIcon color="action" fontSize="small" sx={{ flexShrink: 0 }} />
                <Typography variant="body1" fontWeight="medium" noWrap>
                  {formatDateShort(request.requesterDate)}
                  <SwapIcon sx={{ mx: 0.5, verticalAlign: 'middle', fontSize: '1rem' }} />
                  {formatDateShort(request.targetDate)}
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 3 }} sx={{ mb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                  <PersonIcon color="action" fontSize="small" sx={{ flexShrink: 0 }} />
                  <Typography variant="body2" noWrap>
                    Solicitant: <strong>{request.requester?.fullName}</strong>
                  </Typography>
                </Stack>
                {acceptedResponse && (
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <SwapIcon color="success" fontSize="small" sx={{ flexShrink: 0 }} />
                    <Typography variant="body2" color="success.main" noWrap>
                      Schimb cu: <strong>{acceptedResponse.responder?.fullName}</strong>
                    </Typography>
                  </Stack>
                )}
              </Stack>

              {request.reason && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontStyle: 'italic',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  "{request.reason}"
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
              <Tooltip title="Vezi detalii">
                <IconButton onClick={() => handleOpenDetails(request)} size={isMobile ? 'small' : 'medium'}>
                  <ViewIcon />
                </IconButton>
              </Tooltip>

              {request.status === 'AWAITING_ADMIN' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<CheckIcon />}
                    onClick={() => handleOpenActionDialog(request, 'approve')}
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                  >
                    Aprobă
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<CloseIcon />}
                    onClick={() => handleOpenActionDialog(request, 'reject')}
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                  >
                    Respinge
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Statistics
  const approvedCount = allRequests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = allRequests.filter((r) => r.status === 'REJECTED').length;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with Gradient */}
      <GradientHeader
        title="Administrare Schimburi"
        subtitle="Gestionează și aprobă cererile de schimb de ture"
        icon={<AdminIcon />}
        gradient="#6366f1 0%, #8b5cf6 100%"
      >
        <Chip
          icon={<SwapIcon sx={{ fontSize: 16 }} />}
          label={`${allRequests.length} total`}
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          size="small"
        />
        {awaitingAdminRequests.length > 0 && (
          <Chip
            icon={<TimeIcon sx={{ fontSize: 16 }} />}
            label={`${awaitingAdminRequests.length} de aprobat`}
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
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            title="Așteaptă Aprobare"
            value={awaitingAdminRequests.length}
            subtitle={awaitingAdminRequests.length > 0 ? 'Acțiune necesară' : undefined}
            icon={<TimeIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#f59e0b' }} />}
            color="#f59e0b"
            bgColor={alpha('#f59e0b', 0.12)}
            delay={0}
            urgent={awaitingAdminRequests.length > 0}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            title="În Curs"
            value={pendingRequests.length}
            subtitle="Așteaptă răspuns"
            icon={<PendingIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#2563eb' }} />}
            color="#2563eb"
            bgColor={alpha('#2563eb', 0.12)}
            delay={100}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            title="Aprobate"
            value={approvedCount}
            icon={<ApprovedIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#10b981' }} />}
            color="#10b981"
            bgColor={alpha('#10b981', 0.12)}
            delay={200}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            title="Respinse"
            value={rejectedCount}
            icon={<RejectedIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#ef4444' }} />}
            color="#ef4444"
            bgColor={alpha('#ef4444', 0.12)}
            delay={300}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <span>Așteaptă Aprobare</span>
                {awaitingAdminRequests.length > 0 && (
                  <Chip label={awaitingAdminRequests.length} size="small" color="info" />
                )}
              </Stack>
            }
          />
          <Tab
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <span>În Curs</span>
                {pendingRequests.length > 0 && (
                  <Chip label={pendingRequests.length} size="small" color="warning" />
                )}
              </Stack>
            }
          />
          <Tab label="Istoric" />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Awaiting Admin Approval */}
          <TabPanel value={tabValue} index={0}>
            {awaitingAdminRequests.length === 0 ? (
              <Alert severity="info" icon={<CheckIcon />}>
                Nu există cereri care așteaptă aprobarea ta.
              </Alert>
            ) : (
              awaitingAdminRequests.map((request) => renderRequestCard(request))
            )}
          </TabPanel>

          {/* Pending (awaiting user response) */}
          <TabPanel value={tabValue} index={1}>
            {pendingRequests.length === 0 ? (
              <Alert severity="info" icon={<SwapIcon />}>
                Nu există cereri în curs de procesare.
              </Alert>
            ) : (
              pendingRequests.map((request) => renderRequestCard(request))
            )}
          </TabPanel>

          {/* History */}
          <TabPanel value={tabValue} index={2}>
            {completedRequests.length === 0 ? (
              <Alert severity="info">Nu există cereri finalizate.</Alert>
            ) : isMobile ? (
              // Mobile view - cards instead of table
              <Stack spacing={2}>
                {completedRequests.map((request) => {
                  const acceptedResponse = request.responses?.find((r) => r.response === 'ACCEPTED');
                  return (
                    <Card key={request.id} variant="outlined">
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Chip
                              label={getStatusLabel(request.status)}
                              color={getStatusColor(request.status)}
                              size="small"
                              sx={{ mb: 1 }}
                            />
                            <Typography variant="body2" fontWeight="medium" noWrap>
                              {formatDateShort(request.requesterDate)} ↔ {formatDateShort(request.targetDate)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {request.requester?.fullName}
                              {acceptedResponse && ` → ${acceptedResponse.responder?.fullName}`}
                            </Typography>
                          </Box>
                          <IconButton size="small" onClick={() => handleOpenDetails(request)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              // Desktop view - table
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Solicitant</TableCell>
                      <TableCell>Schimb cu</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Acțiuni</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {completedRequests.map((request) => {
                      const acceptedResponse = request.responses?.find((r) => r.response === 'ACCEPTED');
                      return (
                        <TableRow key={request.id}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateShort(request.requesterDate)} ↔ {formatDateShort(request.targetDate)}</TableCell>
                          <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{request.requester?.fullName}</TableCell>
                          <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acceptedResponse?.responder?.fullName || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(request.status)}
                              color={getStatusColor(request.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleOpenDetails(request)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Box>
      </Paper>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Detalii Cerere de Schimb
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    icon={getStatusIcon(selectedRequest.status)}
                    label={getStatusLabel(selectedRequest.status)}
                    color={getStatusColor(selectedRequest.status)}
                  />
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">Date Schimb</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(selectedRequest.requesterDate)} ↔ {formatDate(selectedRequest.targetDate)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">Solicitant</Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {selectedRequest.requester?.fullName?.charAt(0)}
                  </Avatar>
                  <Typography variant="body1">{selectedRequest.requester?.fullName}</Typography>
                </Stack>
              </Box>

              {selectedRequest.reason && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Motiv</Typography>
                  <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                    "{selectedRequest.reason}"
                  </Typography>
                </Box>
              )}

              {selectedRequest.responses && selectedRequest.responses.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Răspunsuri</Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {selectedRequest.responses.map((response) => (
                      <Paper key={response.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                              {response.responder?.fullName?.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">{response.responder?.fullName}</Typography>
                          </Stack>
                          <Chip
                            icon={response.response === 'ACCEPTED' ? <CheckIcon /> : <CloseIcon />}
                            label={response.response === 'ACCEPTED' ? 'Acceptat' : 'Refuzat'}
                            color={response.response === 'ACCEPTED' ? 'success' : 'error'}
                            size="small"
                          />
                        </Stack>
                        {response.message && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                            "{response.message}"
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              {selectedRequest.adminNotes && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Note Admin</Typography>
                  <Typography variant="body1">{selectedRequest.adminNotes}</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="caption" color="text.secondary">Creat la</Typography>
                <Typography variant="body2">
                  {new Date(selectedRequest.createdAt).toLocaleString('ro-RO')}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Închide</Button>
          {selectedRequest?.status === 'AWAITING_ADMIN' && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  setDetailsDialogOpen(false);
                  handleOpenActionDialog(selectedRequest, 'approve');
                }}
              >
                Aprobă
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setDetailsDialogOpen(false);
                  handleOpenActionDialog(selectedRequest, 'reject');
                }}
              >
                Respinge
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {actionType === 'approve' ? 'Aprobă Schimbul de Tură' : 'Respinge Cererea de Schimb'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedRequest && (
              <Alert severity={actionType === 'approve' ? 'success' : 'warning'}>
                {actionType === 'approve'
                  ? `Vei aproba schimbul între ${selectedRequest.requester?.fullName} și ${selectedRequest.responses?.find((r) => r.response === 'ACCEPTED')?.responder?.fullName}. ${selectedRequest.requester?.fullName} va lucra în ${formatDateShort(selectedRequest.targetDate)}, iar colegul în ${formatDateShort(selectedRequest.requesterDate)}.`
                  : `Vei respinge cererea de schimb pentru datele ${formatDateShort(selectedRequest.requesterDate)} ↔ ${formatDateShort(selectedRequest.targetDate)}.`}
              </Alert>
            )}
            <TextField
              label={actionType === 'approve' ? 'Note (opțional)' : 'Motiv respingere'}
              multiline
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={actionType === 'approve' ? 'Adaugă note...' : 'Explică de ce respingi...'}
              required={actionType === 'reject'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Anulează</Button>
          <Button
            variant="contained"
            color={actionType === 'approve' ? 'success' : 'error'}
            onClick={handleAction}
            disabled={approving || rejecting || (actionType === 'reject' && !adminNotes)}
            startIcon={(approving || rejecting) ? <CircularProgress size={20} /> : (actionType === 'approve' ? <CheckIcon /> : <CloseIcon />)}
          >
            {(approving || rejecting) ? 'Se procesează...' : (actionType === 'approve' ? 'Aprobă' : 'Respinge')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminShiftSwapsPage;
