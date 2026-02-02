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
} from '@mui/icons-material';
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
    } catch (err) {
      // Error handled by RTK Query
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
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Gestionare Concedii
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Aprobă sau respinge cererile de concediu ale angajaților
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1, bgcolor: 'warning.lighter' }}>
          <Typography variant="h4" fontWeight="bold" color="warning.dark">
            {pendingRequests.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            În Așteptare
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, bgcolor: 'success.lighter' }}>
          <Typography variant="h4" fontWeight="bold" color="success.dark">
            {approvedRequests.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aprobate
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, bgcolor: 'error.lighter' }}>
          <Typography variant="h4" fontWeight="bold" color="error.dark">
            {rejectedRequests.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Respinse
          </Typography>
        </Paper>
      </Stack>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label={`Așteaptă Aprobare (${pendingRequests.length})`} />
        <Tab label={`Aprobate (${approvedRequests.length})`} />
        <Tab label={`Respinse (${rejectedRequests.length})`} />
      </Tabs>

      {/* Requests List */}
      {displayedRequests.length === 0 ? (
        <Alert severity="info">
          Nu există cereri în această categorie.
        </Alert>
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

                  <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                    {request.status === 'PENDING' ? (
                      <>
                        <Tooltip title="Aprobă">
                          <IconButton
                            color="success"
                            onClick={() => handleOpenDialog(request, 'APPROVED')}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Respinge">
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDialog(request, 'REJECTED')}
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
