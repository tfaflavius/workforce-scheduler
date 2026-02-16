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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl as MuiFormControl,
  FormLabel,
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
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { GradientHeader, StatCard } from '../../components/common';
import {
  useGetAllSwapRequestsQuery,
  useApproveSwapRequestMutation,
  useRejectSwapRequestMutation,
  useDeleteSwapRequestMutation,
  useLazyGetUsersOnDateQuery,
} from '../../store/api/shiftSwaps.api';
import type { ShiftSwapRequest, ShiftSwapStatus, UserOnDate } from '../../types/shift-swap.types';

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
      return 'In asteptare raspuns';
    case 'AWAITING_ADMIN':
      return 'Asteapta aprobare';
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
  const [selectedResponderId, setSelectedResponderId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // API calls
  const { data: allRequests = [], isLoading } = useGetAllSwapRequestsQuery({});
  const [approveSwap, { isLoading: approving }] = useApproveSwapRequestMutation();
  const [rejectSwap, { isLoading: rejecting }] = useRejectSwapRequestMutation();
  const [deleteSwap, { isLoading: deleting }] = useDeleteSwapRequestMutation();
  const [getUsersOnDate, { data: targetDateUsers = [], isLoading: loadingTargetUsers }] = useLazyGetUsersOnDateQuery();

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

  const handleOpenActionDialog = async (request: ShiftSwapRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes('');
    const acceptedResponses = request.responses?.filter((r) => r.response === 'ACCEPTED') || [];

    if (action === 'approve') {
      if (acceptedResponses.length > 0) {
        // Cineva a acceptat - pre-selecteaza daca e doar unul
        setSelectedResponderId(acceptedResponses.length === 1 ? acceptedResponses[0].responderId : '');
      } else {
        // Nimeni nu a acceptat - adminul alege fortat din lista de colegi pe targetDate
        setSelectedResponderId('');
        const targetDateStr = typeof request.targetDate === 'string'
          ? request.targetDate.split('T')[0]
          : new Date(request.targetDate).toISOString().split('T')[0];
        // Fetch userii care lucreaza pe data tinta (exclude requester-ul)
        await getUsersOnDate({ date: targetDateStr });
      }
    } else {
      setSelectedResponderId('');
    }

    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRequest) return;

    try {
      if (actionType === 'approve') {
        if (!selectedResponderId) {
          setErrorMessage('Selecteaza colegul cu care se va face schimbul.');
          setTimeout(() => setErrorMessage(null), 5000);
          return;
        }
        await approveSwap({
          id: selectedRequest.id,
          data: {
            approvedResponderId: selectedResponderId,
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
      setSuccessMessage(actionType === 'approve' ? 'Schimbul de tura a fost aprobat cu succes!' : 'Cererea a fost respinsa.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: unknown) {
      console.error('Error processing swap request:', error);
      const errorMsg = error && typeof error === 'object' && 'data' in error
        ? (error.data as { message?: string })?.message || 'A aparut o eroare la procesarea cererii.'
        : 'A aparut o eroare la procesarea cererii.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleDeleteSwap = async (request: ShiftSwapRequest) => {
    if (!window.confirm(`Esti sigur ca vrei sa stergi cererea de schimb a lui ${request.requester?.fullName}? Aceasta actiune este ireversibila.`)) {
      return;
    }

    try {
      await deleteSwap(request.id).unwrap();
      setSuccessMessage('Cererea de schimb a fost stearsa cu succes.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: unknown) {
      console.error('Error deleting swap request:', error);
      const errorMsg = error && typeof error === 'object' && 'data' in error
        ? (error.data as { message?: string })?.message || 'A aparut o eroare la stergerea cererii.'
        : 'A aparut o eroare la stergerea cererii.';
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
    const acceptedResponses = request.responses?.filter((r) => r.response === 'ACCEPTED') || [];

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
                {acceptedResponses.length > 0 && (
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }} flexWrap="wrap">
                    <CheckIcon color="success" fontSize="small" sx={{ flexShrink: 0 }} />
                    <Typography variant="body2" color="success.main">
                      {acceptedResponses.length === 1
                        ? <>Au acceptat: <strong>{acceptedResponses[0].responder?.fullName}</strong></>
                        : <>Au acceptat: <strong>{acceptedResponses.length} colegi</strong></>
                      }
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

              <Tooltip title="Sterge cererea">
                <IconButton
                  onClick={() => handleDeleteSwap(request)}
                  size={isMobile ? 'small' : 'medium'}
                  color="error"
                  disabled={deleting}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>

              {(request.status === 'AWAITING_ADMIN' || request.status === 'PENDING') && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<CheckIcon />}
                    onClick={() => handleOpenActionDialog(request, 'approve')}
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                  >
                    {request.status === 'PENDING' ? 'Aloca' : 'Aproba'}
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
        subtitle="Gestioneaza si aproba cererile de schimb de ture"
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
            title="Asteapta Aprobare"
            value={awaitingAdminRequests.length}
            subtitle={awaitingAdminRequests.length > 0 ? 'Actiune necesara' : undefined}
            icon={<TimeIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: '#f59e0b' }} />}
            color="#f59e0b"
            bgColor={alpha('#f59e0b', 0.12)}
            delay={0}
            urgent={awaitingAdminRequests.length > 0}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            title="In Curs"
            value={pendingRequests.length}
            subtitle="Asteapta raspuns"
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
                <span>Asteapta Aprobare</span>
                {awaitingAdminRequests.length > 0 && (
                  <Chip label={awaitingAdminRequests.length} size="small" color="info" />
                )}
              </Stack>
            }
          />
          <Tab
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <span>In Curs</span>
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
                Nu exista cereri care asteapta aprobarea ta.
              </Alert>
            ) : (
              awaitingAdminRequests.map((request) => renderRequestCard(request))
            )}
          </TabPanel>

          {/* Pending (awaiting user response) */}
          <TabPanel value={tabValue} index={1}>
            {pendingRequests.length === 0 ? (
              <Alert severity="info" icon={<SwapIcon />}>
                Nu exista cereri in curs de procesare.
              </Alert>
            ) : (
              pendingRequests.map((request) => renderRequestCard(request))
            )}
          </TabPanel>

          {/* History */}
          <TabPanel value={tabValue} index={2}>
            {completedRequests.length === 0 ? (
              <Alert severity="info">Nu exista cereri finalizate.</Alert>
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
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" onClick={() => handleOpenDetails(request)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteSwap(request)} disabled={deleting}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
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
                      <TableCell align="right">Actiuni</TableCell>
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
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <IconButton size="small" onClick={() => handleOpenDetails(request)}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteSwap(request)} disabled={deleting}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
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
                  <Typography variant="caption" color="text.secondary">Raspunsuri</Typography>
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
          <Button onClick={() => setDetailsDialogOpen(false)}>Inchide</Button>
          {(selectedRequest?.status === 'AWAITING_ADMIN' || selectedRequest?.status === 'PENDING') && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  setDetailsDialogOpen(false);
                  handleOpenActionDialog(selectedRequest, 'approve');
                }}
              >
                {selectedRequest?.status === 'PENDING' ? 'Aloca' : 'Aproba'}
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
          {actionType === 'approve'
            ? (selectedRequest?.status === 'PENDING' ? 'Aloca Schimb de Tura' : 'Aproba Schimbul de Tura')
            : 'Respinge Cererea de Schimb'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedRequest && actionType === 'approve' && (
              <>
                {(() => {
                  const acceptedResponses = selectedRequest.responses?.filter((r) => r.response === 'ACCEPTED') || [];

                  // Cazul 1: Nimeni nu a acceptat - admin aloca fortat
                  if (acceptedResponses.length === 0) {
                    // Filtram userii de pe targetDate, excludem requester-ul
                    const availableUsers = targetDateUsers.filter(
                      (u: UserOnDate) => u.id !== selectedRequest.requesterId
                    );

                    if (loadingTargetUsers) {
                      return (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} />
                          <Typography variant="body2" sx={{ ml: 1 }}>Se incarca colegii...</Typography>
                        </Box>
                      );
                    }

                    if (availableUsers.length === 0) {
                      return (
                        <Alert severity="warning">
                          Nu s-au gasit colegi care lucreaza in {formatDateShort(selectedRequest.targetDate)}.
                        </Alert>
                      );
                    }

                    return (
                      <>
                        <Alert severity="info">
                          Niciun coleg nu a acceptat cererea. Selecteaza manual colegul cu care se va face schimbul fortat:
                        </Alert>
                        <MuiFormControl component="fieldset">
                          <FormLabel component="legend">
                            Colegi care lucreaza in {formatDateShort(selectedRequest.targetDate)}
                          </FormLabel>
                          <RadioGroup
                            value={selectedResponderId}
                            onChange={(e) => setSelectedResponderId(e.target.value)}
                          >
                            {availableUsers.map((user: UserOnDate) => (
                              <FormControlLabel
                                key={user.id}
                                value={user.id}
                                control={<Radio />}
                                label={
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                                      {user.fullName?.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2">{user.fullName}</Typography>
                                  </Stack>
                                }
                              />
                            ))}
                          </RadioGroup>
                        </MuiFormControl>
                      </>
                    );
                  }

                  // Cazul 2: Un singur coleg a acceptat
                  if (acceptedResponses.length === 1) {
                    return (
                      <Alert severity="success">
                        Vei aproba schimbul intre <strong>{selectedRequest.requester?.fullName}</strong> si <strong>{acceptedResponses[0].responder?.fullName}</strong>.
                        {selectedRequest.requester?.fullName} va lucra in {formatDateShort(selectedRequest.targetDate)}, iar {acceptedResponses[0].responder?.fullName} in {formatDateShort(selectedRequest.requesterDate)}.
                      </Alert>
                    );
                  }

                  // Cazul 3: Mai multi colegi au acceptat - adminul alege
                  return (
                    <>
                      <Alert severity="info">
                        <strong>{acceptedResponses.length} colegi</strong> au acceptat cererea. Alege cu cine se va face schimbul:
                      </Alert>
                      <MuiFormControl component="fieldset">
                        <FormLabel component="legend">Selecteaza colegul pentru schimb</FormLabel>
                        <RadioGroup
                          value={selectedResponderId}
                          onChange={(e) => setSelectedResponderId(e.target.value)}
                        >
                          {acceptedResponses.map((resp) => (
                            <FormControlLabel
                              key={resp.responderId}
                              value={resp.responderId}
                              control={<Radio />}
                              label={
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                                    {resp.responder?.fullName?.charAt(0)}
                                  </Avatar>
                                  <Typography variant="body2">
                                    {resp.responder?.fullName}
                                    {resp.message && (
                                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                        - "{resp.message}"
                                      </Typography>
                                    )}
                                  </Typography>
                                </Stack>
                              }
                            />
                          ))}
                        </RadioGroup>
                      </MuiFormControl>
                    </>
                  );
                })()}
              </>
            )}
            {selectedRequest && actionType === 'reject' && (
              <Alert severity="warning">
                Vei respinge cererea de schimb pentru datele {formatDateShort(selectedRequest.requesterDate)} ↔ {formatDateShort(selectedRequest.targetDate)}.
              </Alert>
            )}
            <TextField
              label={actionType === 'approve' ? 'Note (optional)' : 'Motiv respingere'}
              multiline
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={actionType === 'approve' ? 'Adauga note...' : 'Explica de ce respingi...'}
              required={actionType === 'reject'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Anuleaza</Button>
          <Button
            variant="contained"
            color={actionType === 'approve' ? 'success' : 'error'}
            onClick={handleAction}
            disabled={approving || rejecting || (actionType === 'reject' && !adminNotes) || (actionType === 'approve' && !selectedResponderId)}
            startIcon={(approving || rejecting) ? <CircularProgress size={20} /> : (actionType === 'approve' ? <CheckIcon /> : <CloseIcon />)}
          >
            {(approving || rejecting) ? 'Se proceseaza...' : (actionType === 'approve' ? (selectedRequest?.status === 'PENDING' ? 'Aloca' : 'Aproba') : 'Respinge')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminShiftSwapsPage;
