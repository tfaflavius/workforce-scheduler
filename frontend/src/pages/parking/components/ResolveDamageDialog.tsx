import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useResolveParkingDamageMutation } from '../../../store/api/parking.api';
import type { ParkingDamage, DamageResolutionType } from '../../../types/parking.types';
import { RESOLUTION_TYPE_LABELS } from '../../../types/parking.types';

interface ResolveDamageDialogProps {
  open: boolean;
  onClose: () => void;
  damage: ParkingDamage;
}

const ResolveDamageDialog: React.FC<ResolveDamageDialogProps> = ({ open, onClose, damage }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [resolveDamage, { isLoading }] = useResolveParkingDamageMutation();
  const [resolutionType, setResolutionType] = useState<DamageResolutionType | ''>('');
  const [resolutionDescription, setResolutionDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!resolutionType) {
      setError('Selecteaza tipul de finalizare');
      return;
    }
    if (!resolutionDescription.trim()) {
      setError('Descrierea rezolvarii este obligatorie');
      return;
    }

    try {
      await resolveDamage({
        id: damage.id,
        data: {
          resolutionType,
          resolutionDescription,
        },
      }).unwrap();
      handleClose();
    } catch (err: any) {
      setError(err.data?.message || 'A aparut o eroare');
    }
  };

  const handleClose = () => {
    setResolutionType('');
    setResolutionDescription('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>Finalizeaza Prejudiciul</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Damage Details */}
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Detalii prejudiciu:
            </Typography>
            <Typography variant="body2">
              <strong>Parcare:</strong> {damage.parkingLot?.name}
            </Typography>
            <Typography variant="body2">
              <strong>Echipament:</strong> {damage.damagedEquipment}
            </Typography>
            <Typography variant="body2">
              <strong>Persoana:</strong> {damage.personName}
            </Typography>
            <Typography variant="body2">
              <strong>Telefon:</strong> {damage.phone}
            </Typography>
            <Typography variant="body2">
              <strong>Nr. Masina:</strong> {damage.carPlate}
            </Typography>
            <Typography variant="body2">
              <strong>Descriere:</strong> {damage.description}
            </Typography>
          </Stack>

          <Divider />

          <FormControl fullWidth required>
            <InputLabel>Tip Finalizare</InputLabel>
            <Select
              value={resolutionType}
              label="Tip Finalizare"
              onChange={(e) => setResolutionType(e.target.value as DamageResolutionType)}
            >
              <MenuItem value="RECUPERAT">{RESOLUTION_TYPE_LABELS.RECUPERAT}</MenuItem>
              <MenuItem value="TRIMIS_JURIDIC">{RESOLUTION_TYPE_LABELS.TRIMIS_JURIDIC}</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Descrierea rezolvarii"
            multiline
            rows={4}
            value={resolutionDescription}
            onChange={(e) => setResolutionDescription(e.target.value)}
            required
            fullWidth
            placeholder={
              resolutionType === 'RECUPERAT'
                ? 'Descrie cum a fost recuperat prejudiciul...'
                : resolutionType === 'TRIMIS_JURIDIC'
                ? 'Descrie detaliile trimiterii la Directia Juridica...'
                : 'Selecteaza tipul de finalizare...'
            }
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

export default ResolveDamageDialog;
