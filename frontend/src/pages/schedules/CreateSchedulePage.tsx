import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCreateScheduleMutation } from '../../store/api/schedulesApi';
import type { CreateScheduleRequest } from '../../types/schedule.types';

const CreateSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`; // Next month
  });
  const [notes, setNotes] = useState('');

  const [createSchedule, { isLoading, error }] = useCreateScheduleMutation();

  const steps = ['Basic Information', 'Review & Create'];

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (activeStep === 0) {
      navigate('/schedules');
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const request: CreateScheduleRequest = {
        monthYear,
        assignments: [], // Empty for now, will be added via update
        notes: notes || undefined,
      };

      console.log('Creating schedule with request:', request);
      const result = await createSchedule(request).unwrap();
      console.log('Schedule created successfully:', result);
      navigate('/schedules');
    } catch (err: any) {
      console.error('Failed to create schedule:', err);
      console.error('Error details:', err.data || err.message || err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          <Box>
            <Typography variant="h4">Create Work Schedule</Typography>
            <Typography variant="body2" color="text.secondary">
              Create a new monthly work schedule with shift assignments
            </Typography>
          </Box>
        </Stack>

        {/* Stepper */}
        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error">
            Failed to create schedule. Please try again.
          </Alert>
        )}

        {/* Step Content */}
        <Paper sx={{ p: 3 }}>
          {activeStep === 0 && (
            <Stack spacing={3}>
              <Typography variant="h6">Schedule Information</Typography>

              <FormControl fullWidth required>
                <InputLabel>Month</InputLabel>
                <Select
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                  label="Month"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() + i);
                    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const label = date.toLocaleDateString('ro-RO', {
                      year: 'numeric',
                      month: 'long',
                    });
                    return (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or comments about this schedule..."
              />

              <Alert severity="info">
                After creating the schedule, you can add shift assignments to individual employees.
                The system will automatically validate labor law compliance.
              </Alert>

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={handleBack}>Cancel</Button>
                <Button variant="contained" onClick={handleNext}>
                  Next
                </Button>
              </Stack>
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={3}>
              <Typography variant="h6">Review Schedule</Typography>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Month
                </Typography>
                <Typography variant="body1">
                  {new Date(`${monthYear}-01`).toLocaleDateString('ro-RO', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </Typography>
              </Box>

              {notes && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body1">{notes}</Typography>
                </Box>
              )}

              <Alert severity="warning">
                The schedule will be created in DRAFT status. You can add shift assignments
                and then submit it for approval.
              </Alert>

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={handleBack}>Back</Button>
                <Button
                  variant="contained"
                  startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleCreateSchedule}
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Schedule'}
                </Button>
              </Stack>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
};

export default CreateSchedulePage;
