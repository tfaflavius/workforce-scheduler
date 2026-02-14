import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Add as AddIcon,
  ContentCopy as CloneIcon,
  Home as HomeIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import {
  useGetScheduleQuery,
  useUpdateScheduleMutation,
  useSubmitScheduleMutation,
  useGetShiftTypesQuery,
  useLazyValidateScheduleQuery,
  useApproveScheduleMutation,
  useRejectScheduleMutation,
  useCloneScheduleMutation,
  useExportScheduleMutation,
} from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import type { ScheduleAssignmentDto } from '../../types/schedule.types';

export const EditSchedulePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: schedule, isLoading: scheduleLoading } = useGetScheduleQuery(id!);
  const { data: shiftTypes = [] } = useGetShiftTypesQuery();
  const { data: users = [] } = useGetUsersQuery();
  const [updateSchedule, { isLoading: updating }] = useUpdateScheduleMutation();
  const [submitSchedule, { isLoading: submitting }] = useSubmitScheduleMutation();
  const [validateSchedule] = useLazyValidateScheduleQuery();
  const [approveSchedule, { isLoading: approving }] = useApproveScheduleMutation();
  const [rejectSchedule, { isLoading: rejecting }] = useRejectScheduleMutation();
  const [cloneSchedule, { isLoading: cloning }] = useCloneScheduleMutation();
  const [exportSchedule, { isLoading: exporting }] = useExportScheduleMutation();

  const [assignments, setAssignments] = useState<ScheduleAssignmentDto[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAssignment, setNewAssignment] = useState<Partial<ScheduleAssignmentDto>>({});
  const [error, setError] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneMonth, setCloneMonth] = useState<number>(new Date().getMonth() + 1);
  const [cloneYear, setCloneYear] = useState<number>(new Date().getFullYear());
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  // Initialize assignments from schedule
  React.useEffect(() => {
    if (schedule?.assignments) {
      setAssignments(
        schedule.assignments.map((a) => ({
          userId: a.userId,
          shiftTypeId: a.shiftTypeId,
          // Normalizeaza data pentru a evita probleme cu timezone
          shiftDate: a.shiftDate.split('T')[0],
          notes: a.notes || undefined,
        }))
      );
    }
  }, [schedule]);

  // Compute monthYear from month and year
  const monthYear = useMemo(() => {
    if (!schedule) return '';
    return `${schedule.year}-${String(schedule.month).padStart(2, '0')}`;
  }, [schedule]);

  // Get days in month
  const daysInMonth = useMemo(() => {
    if (!schedule) return [];
    const date = new Date(schedule.year, schedule.month - 1, 1);
    const days: Date[] = [];
    while (date.getMonth() === schedule.month - 1) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [schedule]);

  const handleAddAssignment = () => {
    if (newAssignment.userId && newAssignment.shiftTypeId && newAssignment.shiftDate) {
      setAssignments([
        ...assignments,
        {
          userId: newAssignment.userId,
          shiftTypeId: newAssignment.shiftTypeId,
          shiftDate: newAssignment.shiftDate,
          notes: newAssignment.notes,
        },
      ]);
      setNewAssignment({});
      setShowAddDialog(false);
    }
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setError(null);
      console.log('Saving schedule:', id, 'with', assignments.length, 'assignments');
      const result = await updateSchedule({
        id: id!,
        data: { assignments },
      }).unwrap();
      console.log('Schedule saved successfully:', result);
      navigate('/schedules');
      console.log('Navigation called to /schedules');
    } catch (err: any) {
      console.error('Failed to update schedule:', err);
      const errorMessage = err?.data?.message || err?.message || 'Failed to save schedule';
      setError(errorMessage);
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      setError(null);
      setValidationDetails(null);
      console.log('Submitting schedule for approval:', id);

      // First, save any pending assignments
      console.log('Saving assignments before submit:', assignments.length);
      await updateSchedule({
        id: id!,
        data: { assignments },
      }).unwrap();
      console.log('Assignments saved');

      // Then submit for approval
      const result = await submitSchedule(id!).unwrap();
      console.log('Schedule submitted successfully:', result);
      navigate('/schedules');
      console.log('Navigation called to /schedules');
    } catch (err: any) {
      console.error('Failed to submit schedule:', err);
      const errorMessage = err?.data?.message || err?.message || 'Failed to submit schedule';
      setError(errorMessage);

      // If it's a labor law violation, fetch validation details
      if (errorMessage.includes('labor law violations')) {
        try {
          const validation = await validateSchedule(id!).unwrap();
          console.log('Validation details:', validation);
          setValidationDetails(validation);
        } catch (validationErr) {
          console.error('Failed to fetch validation details:', validationErr);
        }
      }
    }
  };

  const handleForceSubmit = async () => {
    try {
      setError(null);
      setValidationDetails(null);
      console.log('Force submitting schedule (admin override):', id);

      // First, save any pending assignments
      console.log('Saving assignments before force submit:', assignments.length);
      await updateSchedule({
        id: id!,
        data: { assignments },
      }).unwrap();
      console.log('Assignments saved');

      // Change status directly to PENDING_APPROVAL without validation
      await updateSchedule({
        id: id!,
        data: { status: 'PENDING_APPROVAL' },
      }).unwrap();

      console.log('Schedule force submitted successfully');
      navigate('/schedules');
    } catch (err: any) {
      console.error('Failed to force submit schedule:', err);
      const errorMessage = err?.data?.message || err?.message || 'Failed to force submit schedule';
      setError(errorMessage);
    }
  };

  const handleApprove = async () => {
    try {
      setError(null);
      setValidationDetails(null);
      console.log('Checking labor law violations before approval:', id);

      // First, check for labor law violations
      const validation = await validateSchedule(id!).unwrap();
      console.log('Validation result:', validation);

      if (validation.violations && validation.violations.length > 0) {
        // Show violations to user and ask for confirmation
        setValidationDetails(validation);
        setError('Acest program incalca legea muncii. Verificati detaliile de mai jos si confirmati aprobarea daca doriti sa continuati.');
        return;
      }

      // No violations, approve directly
      console.log('No violations, approving schedule:', id);
      await approveSchedule({ id: id! }).unwrap();
      console.log('Schedule approved successfully');
      navigate('/schedules');
    } catch (err: any) {
      console.error('Failed to approve schedule:', err);
      const errorMessage = err?.data?.message || err?.message || 'Failed to approve schedule';
      setError(errorMessage);
    }
  };

  const handleForceApprove = async () => {
    try {
      setError(null);
      setValidationDetails(null);
      console.log('Force approving schedule with violations:', id);

      await approveSchedule({ id: id! }).unwrap();
      console.log('Schedule approved successfully (with violations)');
      navigate('/schedules');
    } catch (err: any) {
      console.error('Failed to approve schedule:', err);
      const errorMessage = err?.data?.message || err?.message || 'Failed to approve schedule';
      setError(errorMessage);
    }
  };

  const handleRejectClick = () => {
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    try {
      setError(null);
      console.log('Rejecting schedule:', id, 'with reason:', rejectReason);

      await rejectSchedule({
        id: id!,
        data: { reason: rejectReason }
      }).unwrap();

      console.log('Schedule rejected successfully');
      setShowRejectDialog(false);
      navigate('/schedules');
    } catch (err: any) {
      console.error('Failed to reject schedule:', err);
      const errorMessage = err?.data?.message || err?.message || 'Failed to reject schedule';
      setError(errorMessage);
    }
  };

  const handleCloneClick = () => {
    setShowCloneDialog(true);
  };

  const handleCloneConfirm = async () => {
    try {
      setError(null);
      console.log('Cloning schedule:', id, 'to month:', cloneMonth, 'year:', cloneYear);

      const clonedSchedule = await cloneSchedule({
        id: id!,
        data: {
          month: cloneMonth,
          year: cloneYear,
        },
      }).unwrap();

      console.log('Schedule cloned successfully:', clonedSchedule.id);
      setShowCloneDialog(false);
      navigate(`/schedules/${clonedSchedule.id}`);
    } catch (err: any) {
      console.error('Failed to clone schedule:', err);
      const errorMessage = err?.data?.message || err?.message || 'Failed to clone schedule';
      setError(errorMessage);
    }
  };

  const handleExport = async (format: 'PDF' | 'EXCEL') => {
    try {
      setError(null);
      console.log('Exporting schedule:', id, 'format:', format);

      const result = await exportSchedule({
        id: id!,
        request: {
          format,
          includeViolations: true,
          includeWeeklySummaries: true,
        },
      }).unwrap();

      console.log('Export successful:', result);
      // Open in new tab
      window.open(result.downloadUrl, '_blank');
      setExportMenuAnchor(null);
    } catch (err: any) {
      console.error('Failed to export schedule:', err);
      const errorMessage = err?.data?.message || err?.message || 'Failed to export schedule';
      setError(errorMessage);
    }
  };

  if (scheduleLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!schedule) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Schedule not found</Alert>
      </Container>
    );
  }

  const canEdit = schedule.status === 'DRAFT';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigate('/')} color="primary">
              <HomeIcon />
            </IconButton>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/schedules')}
              variant="outlined"
            >
              Back
            </Button>
            <Box>
              <Typography variant="h4">{monthYear}</Typography>
              <Typography variant="body2" color="text.secondary">
                Status: <Chip label={schedule.status} size="small" />
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              disabled={exporting}
            >
              Export
            </Button>

            <Button
              variant="outlined"
              startIcon={<CloneIcon />}
              onClick={handleCloneClick}
              disabled={cloning}
            >
              Clone to Another Month
            </Button>

            {canEdit && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={updating}
                >
                  Save Draft
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={handleSubmitForApproval}
                  disabled={submitting || updating || assignments.length === 0}
                >
                  Submit for Approval
                </Button>
              </>
            )}
          </Stack>

          {schedule.status === 'PENDING_APPROVAL' && (
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                color="success"
                onClick={handleApprove}
                disabled={approving || rejecting}
              >
                Approve Schedule
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleRejectClick}
                disabled={approving || rejecting}
              >
                Reject Schedule
              </Button>
            </Stack>
          )}
        </Stack>

        {!canEdit && schedule.status !== 'PENDING_APPROVAL' && (
          <Alert severity="info">
            This schedule cannot be edited because it is in {schedule.status} status.
          </Alert>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {schedule.status === 'REJECTED' && schedule.rejectionReason && (
          <Alert severity="error">
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Schedule Rejected
            </Typography>
            <Typography variant="body2">
              Reason: {schedule.rejectionReason}
            </Typography>
          </Alert>
        )}

        {validationDetails && validationDetails.criticalViolations && validationDetails.criticalViolations.length > 0 && (
          <Paper sx={{ p: 3, bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.main' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" color="error">
                Incalcari ale Legii Muncii Detectate:
              </Typography>
              {schedule.status === 'DRAFT' ? (
                <Button
                  variant="contained"
                  color="warning"
                  size="small"
                  onClick={handleForceSubmit}
                  disabled={submitting}
                >
                  Force Submit as Admin
                </Button>
              ) : schedule.status === 'PENDING_APPROVAL' ? (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={handleForceApprove}
                  disabled={approving}
                >
                  Aproba Cu Incalcari
                </Button>
              ) : null}
            </Stack>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {schedule.status === 'PENDING_APPROVAL'
                ? 'Acest program incalca legea muncii. Ca administrator, poti aproba oricum, dar angajatii pot refuza sa lucreze in aceste conditii.'
                : 'Acest program incalca legea muncii. Ca administrator, poti forta trimiterea pentru aprobare, dar angajatii pot refuza sa lucreze in aceste conditii.'
              }
            </Alert>
            <Stack spacing={2}>
              {validationDetails.criticalViolations.map((violation: any, index: number) => (
                <Box key={index} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="error" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {violation.type}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {violation.message}
                  </Typography>
                  {violation.legalReference && (
                    <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                        Referinta Legala:
                      </Typography>
                      <Typography variant="caption" display="block">
                        {violation.legalReference}
                      </Typography>
                    </Alert>
                  )}
                  {violation.dates && (
                    <Typography variant="caption" color="text.secondary">
                      Date: {violation.dates.map((d: string) => new Date(d).toLocaleDateString('ro-RO')).join(' → ')}
                    </Typography>
                  )}
                  {violation.weekNumber && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Saptamana: {violation.weekNumber}
                    </Typography>
                  )}
                  {violation.actualRest !== undefined && violation.requiredRest && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Perioada odihna: {violation.actualRest.toFixed(1)}h (necesar: {violation.requiredRest}h)
                    </Typography>
                  )}
                  {violation.hours !== undefined && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Ore saptamanale: {violation.hours}h
                    </Typography>
                  )}
                  {violation.days !== undefined && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Work days: {violation.days} days
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Assignments */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">Shift Assignments ({assignments.length})</Typography>
            {canEdit && (
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => setShowAddDialog(true)}
              >
                Add Assignment
              </Button>
            )}
          </Stack>

          {assignments.length === 0 ? (
            <Alert severity="info">
              No shift assignments yet. Click "Add Assignment" to start building the schedule.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {assignments.map((assignment, index) => (
                <Card variant="outlined" key={index}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          <strong>Employee:</strong>{' '}
                          {users.find((u) => u.id === assignment.userId)?.fullName || assignment.userId}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Shift Type:</strong>{' '}
                          {shiftTypes.find((st) => st.id === assignment.shiftTypeId)?.name}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Date:</strong> {assignment.shiftDate}
                        </Typography>
                        {assignment.notes && (
                          <Typography variant="body2">
                            <strong>Notes:</strong> {assignment.notes}
                          </Typography>
                        )}
                      </Stack>
                      {canEdit && (
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveAssignment(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Labor Law Validation */}
        {schedule.laborLawValidation && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Labor Law Validation
            </Typography>

            {schedule.laborLawValidation.violations?.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Violations:</Typography>
                <ul>
                  {schedule.laborLawValidation.violations.map((v: any, i: number) => (
                    <li key={i}>{v.message}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {schedule.laborLawValidation.warnings?.length > 0 && (
              <Alert severity="warning">
                <Typography variant="subtitle2">Warnings:</Typography>
                <ul>
                  {schedule.laborLawValidation.warnings.map((w: any, i: number) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {schedule.laborLawValidation.isValid && (
              <Alert severity="success">
                Schedule complies with Romanian labor law requirements.
              </Alert>
            )}
          </Paper>
        )}
      </Stack>

      {/* Add Assignment Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Shift Assignment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                value={newAssignment.userId || ''}
                onChange={(e) => setNewAssignment({ ...newAssignment, userId: e.target.value })}
                label="Employee"
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.fullName} - {user.role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Shift Type</InputLabel>
              <Select
                value={newAssignment.shiftTypeId || ''}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, shiftTypeId: e.target.value })
                }
                label="Shift Type"
              >
                {shiftTypes.map((st) => (
                  <MenuItem key={st.id} value={st.id}>
                    {st.name} ({st.startTime} - {st.endTime})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Date</InputLabel>
              <Select
                value={newAssignment.shiftDate || ''}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, shiftDate: e.target.value })
                }
                label="Date"
              >
                {daysInMonth.map((day) => (
                  <MenuItem
                    key={day.toISOString()}
                    value={day.toISOString().split('T')[0]}
                  >
                    {day.toLocaleDateString('ro-RO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              rows={2}
              value={newAssignment.notes || ''}
              onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddAssignment}
            disabled={
              !newAssignment.userId || !newAssignment.shiftTypeId || !newAssignment.shiftDate
            }
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Schedule Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Schedule</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this schedule. This will be visible to the schedule creator.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this schedule is being rejected..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            color="error"
            disabled={!rejectReason.trim() || rejecting}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clone Schedule Dialog */}
      <Dialog open={showCloneDialog} onClose={() => setShowCloneDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Clone Schedule to Another Month</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Create a copy of this schedule for a different month. All assignments will be copied with adjusted dates.
          </Typography>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Month</InputLabel>
              <Select
                value={cloneMonth}
                onChange={(e) => setCloneMonth(Number(e.target.value))}
                label="Month"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <MenuItem key={month} value={month}>
                    {new Date(2024, month - 1, 1).toLocaleDateString('ro-RO', { month: 'long' })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={cloneYear}
                onChange={(e) => setCloneYear(Number(e.target.value))}
                label="Year"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCloneDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCloneConfirm}
            variant="contained"
            startIcon={<CloneIcon />}
            disabled={cloning}
          >
            Clone Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={() => setExportMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleExport('PDF')}>
          Export PDF
        </MenuItem>
        <MenuItem onClick={() => handleExport('EXCEL')}>
          Export Excel
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default EditSchedulePage;
