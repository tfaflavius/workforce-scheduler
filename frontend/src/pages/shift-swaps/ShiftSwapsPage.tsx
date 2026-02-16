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
  alpha,
  Grid,
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
  Inbox as InboxIcon,
} from '@mui/icons-material';
import { GradientHeader, StatCard } from '../../components/common';
import { useAppSelector } from '../../store/hooks';
import {
  useGetMySwapRequestsQuery,
  useCreateSwapRequestMutation,
  useRespondToSwapRequestMutation,
  useCancelSwapRequestMutation,
  useLazyGetUsersOnDateQuery,
  useLazyGetAvailableSwapDatesQuery,
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
      return 'In asteptare';
    case 'AWAITING_ADMIN':
      return 'Asteapta aprobare admin';
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
  // Check for leave (can be "Concediu" or "Concediu: Concediu de Odihna" etc.)
  if (notes === 'Concediu' || notes.startsWith('Concediu:') || notes.includes('Concediu')) return { name: 'Concediu', startTime: '', endTime: '' };
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // API calls
  const { data: myRequests = [], isLoading: loadingRequests } = useGetMySwapRequestsQuery();
  const [createSwapRequest, { isLoading: creating }] = useCreateSwapRequestMutation();
  const [respondToSwap, { isLoading: responding }] = useRespondToSwapRequestMutation();
  const [cancelSwap, { isLoading: cancelling }] = useCancelSwapRequestMutation();
  const [getUsersOnDate, { data: usersOnDate = [] }] = useLazyGetUsersOnDateQuery();
  const [getAvailableSwapDates, { data: availableSwapDates = [], isLoading: loadingAvailableDates }] = useLazyGetAvailableSwapDatesQuery();

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

  const handleRequesterDateChange = async (date: string) => {
    setRequesterDate(date);
    setTargetDate(''); // Reset target date when requester date changes
    if (date) {
      // Fetch available swap dates from the API (filtered by department + work position server-side)
      await getAvailableSwapDates(date);
    }
  };

  const handleTargetDateChange = async (date: string) => {
    setTargetDate(date);
    if (date) {
      // Find the selected assignment and its schedule's shiftPattern
      const selectedAssignment = myAssignments.find((a) => {
        const dateStr = typeof a.shiftDate === 'string'
          ? a.shiftDate.split('T')[0]
          : new Date(a.shiftDate).toISOString().split('T')[0];
        return dateStr === requesterDate;
      });

      // Find shiftPattern from the schedule that contains this assignment
      let shiftPattern: string | undefined;
      if (selectedAssignment) {
        const parentSchedule = schedules.find((s) =>
          s.assignments?.some((a) => a.id === selectedAssignment.id),
        );
        shiftPattern = parentSchedule?.shiftPattern || undefined;
      }

      // Pass department, work position AND shift pattern filters
      await getUsersOnDate({
        date,
        departmentId: user?.departmentId || undefined,
        workPositionId: selectedAssignment?.workPositionId || undefined,
        shiftPattern,
      });
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
      setSuccessMessage('Cererea de schimb a fost trimisa cu succes!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: unknown) {
      console.error('Error creating swap request:', error);
      const errorMsg = error && typeof error === 'object' && 'data' in error
        ? (error.data as { message?: string })?.message || 'A aparut o eroare la crearea cererii.'
        : 'A aparut o eroare la crearea cererii.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
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
      setSuccessMessage(responseAccepted ? 'Ai acceptat cererea de schimb!' : 'Ai refuzat cererea de schimb.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: unknown) {
      console.error('Error responding to swap:', error);
      const errorMsg = error && typeof error === 'object' && 'data' in error
        ? (error.data as { message?: string })?.message || 'A aparut o eroare la procesarea raspunsului.'
        : 'A aparut o eroare la procesarea raspunsului.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleCancelSwap = async (id: string) => {
    if (window.confirm('Esti sigur ca vrei sa anulezi aceasta cerere de schimb?')) {
      try {
        await cancelSwap(id).unwrap();
        setSuccessMessage('Cererea a fost anulata.');
        setTimeout(() => setSuccessMessage(null), 5000);
      } catch (error: unknown) {
        console.error('Error cancelling swap:', error);
        const errorMsg = error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message || 'A aparut o eroare la anularea cererii.'
          : 'A aparut o eroare la anularea cererii.';
        setErrorMessage(errorMsg);
        setTimeout(() => setErrorMessage(null), 5000);
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

  // Available target dates are now fetched from the API (filtered by department + work position)

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
                    Accepta
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<CloseIcon />}
                    onClick={() => handleOpenRespondDialog(request, false)}
                  >
                    Refuza
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
                <Tooltip title="Anuleaza cererea">
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

  // Calculate stats
  const pendingRequestsCount = sentRequests.filter(r => r.status === 'PENDING').length;
  const unrespondedCount = receivedRequests.filter(r => r.status === 'PENDING' && !r.responses?.find(res => res.responderId === user?.id)).length;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with Gradient */}
      <GradientHeader
        title="Schimburi de Ture"
        subtitle="Solicita sau gestioneaza schimburile de ture cu colegii"
        icon={<SwapIcon />}
        gradient="#6366f1 0%, #8b5cf6 100%"
      />

      {/* Summary Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard
            title="Cererile Mele"
            value={sentRequests.length}
            subtitle={pendingRequestsCount > 0 ? `${pendingRequestsCount} in asteptare` : 'Nicio cerere activa'}
            icon={<SwapIcon sx={{ fontSize: { xs: 22, sm: 26 }, color: '#6366f1' }} />}
            color="#6366f1"
            bgColor={alpha('#6366f1', 0.12)}
            delay={0}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard
            title="Cereri Primite"
            value={receivedRequests.length}
            subtitle={unrespondedCount > 0 ? `${unrespondedCount} necesita raspuns` : 'Toate rezolvate'}
            icon={<InboxIcon sx={{ fontSize: { xs: 22, sm: 26 }, color: '#10b981' }} />}
            color="#10b981"
            bgColor={alpha('#10b981', 0.12)}
            delay={100}
            urgent={unrespondedCount > 0}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' }, height: '100%' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              fullWidth={isMobile}
              size="large"
              sx={{
                px: 3,
                py: { xs: 1.5, sm: 2 },
                fontWeight: 600,
                borderRadius: 2,
                bgcolor: '#6366f1',
                boxShadow: `0 4px 14px ${alpha('#6366f1', 0.3)}`,
                '&:hover': {
                  bgcolor: '#4f46e5',
                  boxShadow: `0 6px 20px ${alpha('#6366f1', 0.4)}`,
                },
              }}
            >
              Cerere Noua
            </Button>
          </Box>
        </Grid>
      </Grid>

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
                Nu ai trimis nicio cerere de schimb. Apasa "Cerere Noua" pentru a solicita un schimb de tura.
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
            <span>Cerere Noua de Schimb</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Select My Date (requester date) */}
            <FormControl fullWidth>
              <InputLabel>Tura mea pe care vreau sa o schimb</InputLabel>
              <Select
                value={requesterDate}
                onChange={(e) => handleRequesterDateChange(e.target.value)}
                label="Tura mea pe care vreau sa o schimb"
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
                {loadingAvailableDates ? (
                  <MenuItem disabled>Se incarca datele...</MenuItem>
                ) : availableSwapDates.length === 0 ? (
                  <MenuItem disabled>
                    {requesterDate ? 'Nu sunt date disponibile cu colegi din acelasi departament' : 'Selecteaza mai intai tura ta'}
                  </MenuItem>
                ) : (
                  availableSwapDates
                    .filter(d => d.date !== requesterDate) // Exclude requester date
                    .map((dateInfo) => (
                      <MenuItem key={dateInfo.date} value={dateInfo.date}>
                        {formatDate(dateInfo.date)} ({dateInfo.count} {dateInfo.count === 1 ? 'coleg' : 'colegi'} lucreaza)
                      </MenuItem>
                    ))
                )}
              </Select>
            </FormControl>

            {/* Show users working on target date */}
            {targetDate && usersOnDate.length > 0 && (
              <Alert severity="info">
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Colegi care lucreaza in {formatDateShort(targetDate)}:</strong>
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
              placeholder="Explica de ce doresti sa faci schimbul..."
              required
              helperText="Obligatoriu - explica motivul cererii tale"
            />

            <Alert severity="info" sx={{ mt: 1 }}>
              Dupa ce trimiti cererea, toti colegii care lucreaza in data dorita vor fi notificati.
              Daca cineva accepta, un administrator va trebui sa aprobe schimbul final.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)}>Anuleaza</Button>
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
          {responseAccepted ? 'Accepta Cererea de Schimb' : 'Refuza Cererea de Schimb'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedRequest && (
              <>
                <Alert severity={responseAccepted ? 'success' : 'warning'}>
                  {responseAccepted
                    ? `Vei accepta sa faci schimb cu ${selectedRequest.requester?.fullName}. Tu vei lucra in ${formatDateShort(selectedRequest.requesterDate)} in loc de ${formatDateShort(selectedRequest.targetDate)}.`
                    : `Vei refuza cererea de schimb de la ${selectedRequest.requester?.fullName}.`}
                </Alert>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Detalii schimb:</strong>
                  </Typography>
                  <Typography variant="body2">
                    • {selectedRequest.requester?.fullName} vrea sa lucreze in: <strong>{formatDateShort(selectedRequest.targetDate)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    • In schimb, tu vei lucra in: <strong>{formatDateShort(selectedRequest.requesterDate)}</strong>
                  </Typography>
                </Box>
              </>
            )}
            <TextField
              label="Mesaj (optional)"
              multiline
              rows={2}
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder={responseAccepted ? 'Adauga un mesaj...' : 'Explica de ce refuzi...'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRespondDialogOpen(false)}>Anuleaza</Button>
          <Button
            variant="contained"
            color={responseAccepted ? 'success' : 'error'}
            onClick={handleRespondToSwap}
            disabled={responding}
            startIcon={responding ? <CircularProgress size={20} /> : (responseAccepted ? <CheckIcon /> : <CloseIcon />)}
          >
            {responding ? 'Se proceseaza...' : (responseAccepted ? 'Accepta' : 'Refuza')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShiftSwapsPage;
