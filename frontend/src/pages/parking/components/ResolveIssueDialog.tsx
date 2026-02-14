import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useResolveParkingIssueMutation } from '../../../store/api/parking.api';
import type { ParkingIssue } from '../../../types/parking.types';

interface ResolveIssueDialogProps {
  open: boolean;
  onClose: () => void;
  issue: ParkingIssue;
}

const ResolveIssueDialog: React.FC<ResolveIssueDialogProps> = ({ open, onClose, issue }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [resolveIssue, { isLoading }] = useResolveParkingIssueMutation();
  const [resolutionDescription, setResolutionDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!resolutionDescription.trim()) {
      setError('Descrierea rezolvarii este obligatorie');
      return;
    }

    try {
      await resolveIssue({
        id: issue.id,
        data: { resolutionDescription },
      }).unwrap();
      handleClose();
    } catch (err: any) {
      setError(err.data?.message || 'A aparut o eroare');
    }
  };

  const handleClose = () => {
    setResolutionDescription('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>Finalizeaza Problema</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Issue Details */}
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Detalii problema:
            </Typography>
            <Typography variant="body2">
              <strong>Parcare:</strong> {issue.parkingLot?.name}
            </Typography>
            <Typography variant="body2">
              <strong>Echipament:</strong> {issue.equipment}
            </Typography>
            <Typography variant="body2">
              <strong>Firma contactata:</strong> {issue.contactedCompany}
            </Typography>
            <Typography variant="body2">
              <strong>Descriere:</strong> {issue.description}
            </Typography>
          </Stack>

          <Divider />

          <TextField
            label="Descrierea rezolvarii"
            multiline
            rows={4}
            value={resolutionDescription}
            onChange={(e) => setResolutionDescription(e.target.value)}
            required
            fullWidth
            placeholder="Descrie cum a fost rezolvata problema..."
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Anuleaza
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="success"
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Finalizeaza'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResolveIssueDialog;
