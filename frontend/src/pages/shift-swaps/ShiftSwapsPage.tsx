import { useState, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  SwapHoriz as SwapIcon,
  Add as AddIcon,
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
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import {
  useGetMySwapRequestsQuery,
  useCreateSwapRequestMutation,
  useRespondToSwapRequestMutation,
  useCancelSwapRequestMutation,
  useLazyGetUsersOnDateQuery,
} from '../../store/api/shiftSwaps.api';
import { useGetSchedulesQuery } from '../../store/api/schedulesApi';
import type { ShiftSwapRequest, ShiftSwapStatus, UserOnDate } from '../../types/shift-swap.types';
import type { ScheduleAssignment } from '../../types/schedule.types';

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
      return 'În așteptare';
    case 'AWAITING_ADMIN':
      return 'Așteaptă aprobare admin';
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

// Helper to get shift info from notes
const getShiftInfoFromNotes = (notes: string | undefined | null) => {
  if (!notes) return { name: 'Liber', startTime: '', endTime: '' };
  if (notes === 'Concediu') return { name: 'Concediu', startTime: '', endTime: '' };
  if (notes.includes('07:00-19:00')) return { name: 'Zi 12h', startTime: '07:00', endTime: '19:00' };
  if (notes.includes('19:00-07:00')) return { name: 'Noapte 12h', startTime: '19:00', endTime: '07:00' };
  if (notes.includes('07:30-15:30')) return { name: 'Zi 8h', startTime: '07:30', endTime: '15:30' };
  if (notes.includes('06:00-14:00')) return { name: 'Zi 8h', startTime: '06:00', endTime: '14:00' };
  if (notes.includes('14:00-22:00')) return { name: 'Zi 8h', startTime: '14:00', endTime: '22:00' };
  if (notes.includes('22:00-06:00')) return { name: 'Noapte 8h', startTime: '22:00', endTime: '06:00' };
  return { name: notes, startTime: '', endTime: '' };
};

const ShiftSwapsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAppSelector((state) => state.auth);
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ShiftSwapRequest | null>(null);
  const [requesterDate, setRequesterDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [reason, setReason] = useState('');
  const [responseAccepted, setResponseAccepted] = useState<boolean | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  // API calls
  const { data: myRequests = [], isLoading: loadingRequests } = useGetMySwapRequestsQuery();
  const [createSwapRequest, { isLoading: creating }] = useCreateSwapRequestMutation();
  const [respondToSwap, { isLoading: responding }] = useRespondToSwapRequestMutation();
  const [cancelSwap, { isLoading: cancelling }] = useCancelSwapRequestMutation();
  const [getUsersOnDate, { data: usersOnDate = [] }] = useLazyGetUsersOnDateQuery();

  // Get current month schedules to find my shifts
  const currentDate = new Date();
  const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const { data: schedules = [] } = useGetSchedulesQuery({ monthYear });

  // Get my assignments
  const myAssignments = useMemo(() => {
    if (!schedules || !user) return [];
    const assignments: ScheduleAssignment[] = [];
    schedules.forEach((schedule) => {
      if (schedule.assignments) {
        const userAssignments = schedule.assignments.filter((a) => a.userId === user.id);
        assignments.push(...userAssignments);
      }
    });
    // Filter only future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return assignments
      .filter((a) => new Date(a.shiftDate) >= today)
      .sort((a, b) => new Date(a.shiftDate).getTime() - new Date(b.shiftDate).getTime());
  }, [schedules, user]);

  // Separate my requests and requests where I'm a potential responder (I work on their target date)
  const sentRequests = myRequests.filter((r) => r.requesterId === user?.id);
  const receivedRequests = myRequests.filter((r) => r.requesterId !== user?.id);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenCreateDialog = () => {
    setRequesterDate('');
    setTargetDate('');
    setReason('');
    setCreateDialogOpen(true);
  };

  const handleRequesterDateChange = (date: string) => {
    setRequesterDate(date);
    setTargetDate(''); // Reset target date when requester date changes
  };

  const handleTargetDateChange = async (date: string) => {
    setTargetDate(date);
    if (date) {
      await getUsersOnDate(date);
    }
  };

  const handleCreateSwapRequest = async () => {
    if (!requesterDate || !targetDate || !reason.trim()) return;

    try {
      await createSwapRequest({
        requesterDate,
        targetDate,
        reason: reason.trim(),
      }).unwrap();
      setCreateDialogOpen(false);
      setRequesterDate('');
      setTargetDate('');
      setReason('');
    } catch (error) {
      console.error('Error creating swap request:', error);
    }
  };

  const handleOpenRespondDialog = (request: ShiftSwapRequest, accepted: boolean) => {
    setSelectedRequest(request);
    setResponseAccepted(accepted);
    setResponseMessage('');
    setRespondDialogOpen(true);
  };

  const handleRespondToSwap = async () => {
    if (!selectedRequest || responseAccepted === null) return;

    try {
      await respondToSwap({
        id: selectedRequest.id,
        data: {
          response: responseAccepted ? 'ACCEPTED' as const : 'REJECTED' as const,
          message: responseMessage || undefined,
        },
      }).unwrap();
      setRespondDialogOpen(false);
      setSelectedRequest(null);
      setResponseAccepted(null);
      setResponseMessage('');
    } catch (error) {
      console.error('Error responding to swap:', error);
    }
  };

  const handleCancelSwap = async (id: string) => {
    if (window.confirm('Ești sigur că vrei să anulezi această cerere de schimb?')) {
      try {
        await cancelSwap(id).unwrap();
      } catch (error) {
        console.error('Error cancelling swap:', error);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ro-RO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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

  // Get available target dates (days when other users work)
  const getAvailableTargetDates = useMemo(() => {
    if (!schedules || !user) return [];
    const dateMap = new Map<string, number>();

    schedules.forEach((schedule) => {
      if (schedule.assignments) {
        schedule.assignments.forEach((a) => {
          if (a.userId !== user.id) {
            const dateStr = typeof a.shiftDate === 'string'
              ? a.shiftDate.split('T')[0]
              : new Date(a.shiftDate).toISOString().split('T')[0];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (new Date(dateStr) >= today) {
              dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
            }
          }
        });
      }
    });

    const allDates: { date: string; count: number }[] = [];
    dateMap.forEach((count, date) => {
      allDates.push({ date, count });
    });

    return allDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [schedules, user]);

  const renderRequestCard = (request: ShiftSwapRequest, isReceived: boolean = false) => {
    const isRequester = request.requesterId === user?.id;
    const myResponse = request.responses?.find((r) => r.responderId === user?.id);
    const acceptedResponse = request.responses?.find((r) => r.response === 'ACCEPTED');

    return (
      <Card key={request.id} sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Chip
                  icon={getStatusIcon(request.status)}
                  label={getStatusLabel(request.status)}
                  color={getStatusColor(request.status)}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {new Date(request.createdAt).toLocaleDateString('ro-RO')}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <CalendarIcon color="action" fontSize="small" />
                <Typography variant="body1" fontWeight="medium">
                  {formatDateShort(request.requesterDate)}
                  <SwapIcon sx={{ mx: 0.5, verticalAlign: 'middle', fontSize: '1rem' }} />
                  {formatDateShort(request.targetDate)}
                </Typography>
              </Stack>

              {isReceived && request.requester && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, minWidth: 0 }}>
                  <PersonIcon color="action" fontSize="small" sx={{ flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary" noWrap>
                    Cerere de la: <strong>{request.requester.fullName}</strong>
                  </Typography>
                </Stack>
              )}

              {!isReceived && acceptedResponse && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, minWidth: 0 }}>
                  <CheckIcon color="success" fontSize="small" sx={{ flexShrink: 0 }} />
                  <Typography variant="body2" color="success.main" noWrap>
                    Acceptat de: <strong>{acceptedResponse.responder?.fullName}</strong>
                  </Typography>
                </Stack>
              )}

              {request.reason && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
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

            <Stack direction="row" spacing={1}>
              {/* Actions for received requests */}
              {isReceived && request.status === 'PENDING' && !myResponse && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<CheckIcon />}
                    onClick={() => handleOpenRespondDialog(request, true)}
                  >
                    Acceptă
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<CloseIcon />}
                    onClick={() => handleOpenRespondDialog(request, false)}
                  >
                    Refuză
                  </Button>
                </>
              )}

              {/* Show my response if already responded */}
              {isReceived && myResponse && (
                <Chip
                  icon={myResponse.response === 'ACCEPTED' ? <CheckIcon /> : <CloseIcon />}
                  label={myResponse.response === 'ACCEPTED' ? 'Ai acceptat' : 'Ai refuzat'}
                  color={myResponse.response === 'ACCEPTED' ? 'success' : 'error'}
                  variant="outlined"
                />
              )}

              {/* Cancel button for sent requests */}
              {isRequester && request.status === 'PENDING' && (
                <Tooltip title="Anulează cererea">
                  <IconButton
                    color="error"
                    onClick={() => handleCancelSwap(request.id)}
                    disabled={cancelling}
                  >
                    <CancelIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  if (loadingRequests) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              Schimburi de Ture
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Solicită sau gestionează schimburile de ture cu colegii
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
          >
            Cerere Nouă
          </Button>
        </Stack>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <span>Cererile Mele</span>
                {sentRequests.length > 0 && (
                  <Chip label={sentRequests.length} size="small" color="primary" />
                )}
              </Stack>
            }
          />
          <Tab
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <span>Cereri Primite</span>
                {receivedRequests.filter((r) => r.status === 'PENDING' && !r.responses?.find((res) => res.responderId === user?.id)).length > 0 && (
                  <Chip
                    label={receivedRequests.filter((r) => r.status === 'PENDING' && !r.responses?.find((res) => res.responderId === user?.id)).length}
                    size="small"
                    color="warning"
                  />
                )}
              </Stack>
            }
          />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Sent Requests */}
          <TabPanel value={tabValue} index={0}>
            {sentRequests.length === 0 ? (
              <Alert severity="info" icon={<SwapIcon />}>
                Nu ai trimis nicio cerere de schimb. Apasă "Cerere Nouă" pentru a solicita un schimb de tură.
              </Alert>
            ) : (
              sentRequests.map((request) => renderRequestCard(request, false))
            )}
          </TabPanel>

          {/* Received Requests */}
          <TabPanel value={tabValue} index={1}>
            {receivedRequests.length === 0 ? (
              <Alert severity="info" icon={<SwapIcon />}>
                Nu ai primit nicio cerere de schimb de la colegi.
              </Alert>
            ) : (
              receivedRequests.map((request) => renderRequestCard(request, true))
            )}
          </TabPanel>
        </Box>
      </Paper>

      {/* Create Swap Request Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SwapIcon color="primary" />
            <span>Cerere Nouă de Schimb</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Select My Date (requester date) */}
            <FormControl fullWidth>
              <InputLabel>Tura mea pe care vreau să o schimb</InputLabel>
              <Select
                value={requesterDate}
                onChange={(e) => handleRequesterDateChange(e.target.value)}
                label="Tura mea pe care vreau să o schimb"
              >
                {myAssignments.length === 0 ? (
                  <MenuItem disabled>Nu ai ture programate</MenuItem>
                ) : (
                  myAssignments.map((assignment) => {
                    const shiftInfo = getShiftInfoFromNotes(assignment.notes);
                    const dateStr = typeof assignment.shiftDate === 'string'
                      ? assignment.shiftDate.split('T')[0]
                      : new Date(assignment.shiftDate).toISOString().split('T')[0];
                    return (
                      <MenuItem key={assignment.id} value={dateStr}>
                        {formatDate(dateStr)} - {shiftInfo.name}
                        {shiftInfo.startTime && ` (${shiftInfo.startTime} - ${shiftInfo.endTime})`}
                      </MenuItem>
                    );
                  })
                )}
              </Select>
            </FormControl>

            {/* Select Target Date */}
            <FormControl fullWidth>
              <InputLabel>Data pe care o doresc</InputLabel>
              <Select
                value={targetDate}
                onChange={(e) => handleTargetDateChange(e.target.value)}
                label="Data pe care o doresc"
                disabled={!requesterDate}
              >
                {getAvailableTargetDates.length === 0 ? (
                  <MenuItem disabled>Nu sunt date disponibile</MenuItem>
                ) : (
                  getAvailableTargetDates
                    .filter(d => d.date !== requesterDate) // Exclude requester date
                    .map((dateInfo) => (
                      <MenuItem key={dateInfo.date} value={dateInfo.date}>
                        {formatDate(dateInfo.date)} ({dateInfo.count} {dateInfo.count === 1 ? 'coleg' : 'colegi'} lucrează)
                      </MenuItem>
                    ))
                )}
              </Select>
            </FormControl>

            {/* Show users working on target date */}
            {targetDate && usersOnDate.length > 0 && (
              <Alert severity="info">
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Colegi care lucrează în {formatDateShort(targetDate)}:</strong>
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                  {usersOnDate.map((u: UserOnDate) => (
                    <Chip
                      key={u.id}
                      avatar={<Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>{u.fullName?.charAt(0).toUpperCase()}</Avatar>}
                      label={u.fullName}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Alert>
            )}

            {/* Reason */}
            <TextField
              label="Motivul cererii"
              multiline
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explică de ce dorești să faci schimbul..."
              required
              helperText="Obligatoriu - explică motivul cererii tale"
            />

            <Alert severity="info" sx={{ mt: 1 }}>
              După ce trimiți cererea, toți colegii care lucrează în data dorită vor fi notificați.
              Dacă cineva acceptă, un administrator va trebui să aprobe schimbul final.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)}>Anulează</Button>
          <Button
            variant="contained"
            onClick={handleCreateSwapRequest}
            disabled={!requesterDate || !targetDate || !reason.trim() || creating}
            startIcon={creating ? <CircularProgress size={20} /> : <SwapIcon />}
          >
            {creating ? 'Se trimite...' : 'Trimite Cererea'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Respond Dialog */}
      <Dialog
        open={respondDialogOpen}
        onClose={() => setRespondDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {responseAccepted ? 'Acceptă Cererea de Schimb' : 'Refuză Cererea de Schimb'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedRequest && (
              <>
                <Alert severity={responseAccepted ? 'success' : 'warning'}>
                  {responseAccepted
                    ? `Vei accepta să faci schimb cu ${selectedRequest.requester?.fullName}. Tu vei lucra în ${formatDateShort(selectedRequest.requesterDate)} în loc de ${formatDateShort(selectedRequest.targetDate)}.`
                    : `Vei refuza cererea de schimb de la ${selectedRequest.requester?.fullName}.`}
                </Alert>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Detalii schimb:</strong>
                  </Typography>
                  <Typography variant="body2">
                    • {selectedRequest.requester?.fullName} vrea să lucreze în: <strong>{formatDateShort(selectedRequest.targetDate)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    • În schimb, tu vei lucra în: <strong>{formatDateShort(selectedRequest.requesterDate)}</strong>
                  </Typography>
                </Box>
              </>
            )}
            <TextField
              label="Mesaj (opțional)"
              multiline
              rows={2}
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder={responseAccepted ? 'Adaugă un mesaj...' : 'Explică de ce refuzi...'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRespondDialogOpen(false)}>Anulează</Button>
          <Button
            variant="contained"
            color={responseAccepted ? 'success' : 'error'}
            onClick={handleRespondToSwap}
            disabled={responding}
            startIcon={responding ? <CircularProgress size={20} /> : (responseAccepted ? <CheckIcon /> : <CloseIcon />)}
          >
            {responding ? 'Se procesează...' : (responseAccepted ? 'Acceptă' : 'Refuză')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShiftSwapsPage;
