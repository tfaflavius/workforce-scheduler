import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Card,
  CardContent,
  Stack,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Tooltip,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  useGetEditRequestsQuery,
  useReviewEditRequestMutation,
} from '../../store/api/parking.api';
import type { EditRequest, EditRequestStatus } from '../../types/parking.types';
import {
  EDIT_REQUEST_STATUS_LABELS,
  EDIT_REQUEST_TYPE_LABELS,
} from '../../types/parking.types';
import GradientHeader from '../../components/common/GradientHeader';
import { getStatusColor } from '../../utils/statusHelpers';
import { formatDateTime } from '../../utils/dateFormatters';
import { useSnackbar } from '../../contexts/SnackbarContext';

const AdminEditRequestsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { notifyError } = useSnackbar();
  const hasHandledNotificationRef = useRef(false);

  // When arriving from notification, show ALL so we can find the specific request
  const notificationEditRequestId = (location.state as any)?.openEditRequestId;
  const [statusFilter, setStatusFilter] = useState<'ALL' | EditRequestStatus>(notificationEditRequestId ? 'ALL' : 'PENDING');
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const { data: requests = [], isLoading, refetch } = useGetEditRequestsQuery(
    statusFilter === 'ALL' ? undefined : statusFilter
  );
  const [reviewRequest, { isLoading: reviewing }] = useReviewEditRequestMutation();

  // Auto-open edit request from notification deep link
  useEffect(() => {
    const openEditRequestId = (location.state as any)?.openEditRequestId;
    if (!openEditRequestId || hasHandledNotificationRef.current) return;

    // Reset filter to ALL so we can find the request regardless of status
    setStatusFilter('ALL');

    if (!isLoading && requests.length > 0) {
      hasHandledNotificationRef.current = true;
      const target = requests.find((r) => r.id === openEditRequestId);
      if (target) {
        setSelectedRequest(target);
        setViewDialogOpen(true);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, isLoading, requests]);

  const handleApprove = (request: EditRequest) => {
    setSelectedRequest(request);
    setApproving(true);
    setRejectionReason('');
    setReviewDialogOpen(true);
  };

  const handleReject = (request: EditRequest) => {
    setSelectedRequest(request);
    setApproving(false);
    setRejectionReason('');
    setReviewDialogOpen(true);
  };

  const handleView = (request: EditRequest) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!selectedRequest) return;

    if (!approving && !rejectionReason.trim()) {
      return;
    }

    try {
      await reviewRequest({
        id: selectedRequest.id,
        data: {
          approved: approving,
          rejectionReason: approving ? undefined : rejectionReason.trim(),
        },
      }).unwrap();

      setReviewDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error reviewing request:', error);
      notifyError('Eroare la procesarea cererii de editare.');
    }
  };

  const formatDate = formatDateTime;

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  const renderRequestCard = (request: EditRequest) => (
    <Card
      key={request.id}
      sx={{
        mb: 2,
        borderRadius: 2,
        borderLeft: request.status === 'PENDING' ? '4px solid' : 'none',
        borderColor: 'warning.main',
      }}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {EDIT_REQUEST_TYPE_LABELS[request.requestType]}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Solicitat de: {request.requester?.fullName}
              </Typography>
            </Box>
            <Chip
              label={EDIT_REQUEST_STATUS_LABELS[request.status]}
              color={getStatusColor(request.status)}
              size="small"
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            {formatDate(request.createdAt)}
          </Typography>

          {request.reason && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="body2">{request.reason}</Typography>
            </Alert>
          )}

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Modificari propuse:
            </Typography>
            {Object.entries(request.proposedChanges).map(([key, value]) => (
              <Typography key={key} variant="body2" sx={{ ml: 1 }}>
                • <strong>{key}:</strong> {String(value.from || '-')} → {String(value.to || '-')}
              </Typography>
            ))}
          </Box>

          {request.status === 'REJECTED' && request.rejectionReason && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              <Typography variant="body2">
                <strong>Motiv respingere:</strong> {request.rejectionReason}
              </Typography>
            </Alert>
          )}

          {request.status === 'PENDING' && (
            <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<ApproveIcon />}
                onClick={() => handleApprove(request)}
                sx={{ flex: 1 }}
              >
                Aproba
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<RejectIcon />}
                onClick={() => handleReject(request)}
                sx={{ flex: 1 }}
              >
                Respinge
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  const renderRequestTable = () => (
    <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Tip</TableCell>
            <TableCell>Solicitant</TableCell>
            <TableCell>Motiv</TableCell>
            <TableCell>Data</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actiuni</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {EDIT_REQUEST_TYPE_LABELS[request.requestType]}
                </Typography>
              </TableCell>
              <TableCell>{request.requester?.fullName}</TableCell>
              <TableCell>
                <Tooltip title={request.reason || 'Fara motiv'}>
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {request.reason || '-'}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell>{formatDate(request.createdAt)}</TableCell>
              <TableCell>
                <Chip
                  label={EDIT_REQUEST_STATUS_LABELS[request.status]}
                  color={getStatusColor(request.status)}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title="Vezi detalii">
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => handleView(request)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  {request.status === 'PENDING' && (
                    <>
                      <Tooltip title="Aproba">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleApprove(request)}
                        >
                          <ApproveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Respinge">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleReject(request)}
                        >
                          <RejectIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ pb: { xs: 10, sm: 4 } }}>
      <GradientHeader
        title="Cereri de Editare"
        subtitle="Aproba sau respinge cererile de modificare"
        gradient="#ff9800 0%, #f57c00 100%"
      />

      {/* Back button and filters */}
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          borderRadius: 2,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={{ xs: 1.5, md: 2 }}
        >
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/parking')}
            variant="outlined"
            sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
          >
            Inapoi la Parcari
          </Button>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ overflow: 'hidden' }}>
            <Tabs
              value={statusFilter}
              onChange={(_, v) => setStatusFilter(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minWidth: 0,
                '& .MuiTab-root': {
                  minWidth: { xs: 'auto', md: 80 },
                  px: { xs: 1, md: 1.5 },
                  fontSize: { xs: '0.75rem', md: '0.875rem' },
                },
              }}
            >
              <Tab label={`In asteptare (${pendingCount})`} value="PENDING" />
              <Tab label="Aprobate" value="APPROVED" />
              <Tab label="Respinse" value="REJECTED" />
              <Tab label="Toate" value="ALL" />
            </Tabs>

            <IconButton
              onClick={() => refetch()}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                flexShrink: 0,
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : requests.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Nu exista cereri de editare in aceasta categorie.
        </Alert>
      ) : isMobile ? (
        requests.map(renderRequestCard)
      ) : (
        renderRequestTable()
      )}

      {/* Review Dialog */}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {approving ? 'Confirma aprobarea' : 'Respinge cererea'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity={approving ? 'success' : 'warning'}>
              {approving
                ? 'Modificarile vor fi aplicate imediat dupa aprobare.'
                : 'Te rugam sa specifici motivul respingerii.'}
            </Alert>

            {!approving && (
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Motivul respingerii *"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explica de ce respingi aceasta cerere..."
              />
            )}

            {selectedRequest && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Modificari propuse:
                </Typography>
                {Object.entries(selectedRequest.proposedChanges).map(([key, value]) => (
                  <Typography key={key} variant="body2" sx={{ ml: 1 }}>
                    • <strong>{key}:</strong> {String(value.from || '-')} → {String(value.to || '-')}
                  </Typography>
                ))}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setReviewDialogOpen(false)} disabled={reviewing}>
            Anuleaza
          </Button>
          <Button
            variant="contained"
            color={approving ? 'success' : 'error'}
            onClick={handleConfirmReview}
            disabled={reviewing || (!approving && !rejectionReason.trim())}
            startIcon={
              reviewing ? (
                <CircularProgress size={20} />
              ) : approving ? (
                <ApproveIcon />
              ) : (
                <RejectIcon />
              )
            }
          >
            {approving ? 'Aproba' : 'Respinge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Detalii Cerere de Editare</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Tip
                </Typography>
                <Typography variant="body1">
                  {EDIT_REQUEST_TYPE_LABELS[selectedRequest.requestType]}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Solicitant
                </Typography>
                <Typography variant="body1">
                  {selectedRequest.requester?.fullName}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Data solicitarii
                </Typography>
                <Typography variant="body1">
                  {formatDate(selectedRequest.createdAt)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={EDIT_REQUEST_STATUS_LABELS[selectedRequest.status]}
                  color={getStatusColor(selectedRequest.status)}
                  size="small"
                />
              </Box>

              {selectedRequest.reason && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Motivul cererii
                  </Typography>
                  <Typography variant="body1">{selectedRequest.reason}</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Modificari propuse
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  {Object.entries(selectedRequest.proposedChanges).map(([key, value]) => (
                    <Typography key={key} variant="body2" sx={{ mb: 0.5 }}>
                      • <strong>{key}:</strong>{' '}
                      <span style={{ color: theme.palette.error.main }}>
                        {String(value.from || '-')}
                      </span>{' '}
                      →{' '}
                      <span style={{ color: theme.palette.success.main }}>
                        {String(value.to || '-')}
                      </span>
                    </Typography>
                  ))}
                </Paper>
              </Box>

              {selectedRequest.status === 'REJECTED' && selectedRequest.rejectionReason && (
                <Alert severity="error">
                  <Typography variant="body2">
                    <strong>Motiv respingere:</strong> {selectedRequest.rejectionReason}
                  </Typography>
                </Alert>
              )}

              {selectedRequest.reviewer && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Procesat de
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequest.reviewer.fullName} la {formatDate(selectedRequest.reviewedAt!)}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Inchide</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminEditRequestsPage;
