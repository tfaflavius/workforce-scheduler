import React, { useState, useEffect } from 'react';
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
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  useGetParkingLotsQuery,
  useGetPaymentMachinesQuery,
  useCreateCashCollectionMutation,
} from '../../../store/api/parking.api';
import type { CreateCashCollectionDto } from '../../../types/parking.types';

interface CreateCollectionDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateCollectionDialog: React.FC<CreateCollectionDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { data: parkingLots = [], isLoading: lotsLoading } = useGetParkingLotsQuery();

  const [selectedParkingLotId, setSelectedParkingLotId] = useState('');
  const { data: machines = [], isLoading: machinesLoading } = useGetPaymentMachinesQuery(
    selectedParkingLotId || undefined,
    { skip: !selectedParkingLotId }
  );

  const [createCollection, { isLoading: creating }] = useCreateCashCollectionMutation();

  const [formData, setFormData] = useState<CreateCashCollectionDto>({
    parkingLotId: '',
    paymentMachineId: '',
    amount: 0,
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Reset machine when parking lot changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      parkingLotId: selectedParkingLotId,
      paymentMachineId: '',
    }));
  }, [selectedParkingLotId]);

  const handleSubmit = async () => {
    if (!formData.parkingLotId || !formData.paymentMachineId || formData.amount <= 0) {
      setError('Toate câmpurile sunt obligatorii și suma trebuie să fie pozitivă');
      return;
    }

    try {
      await createCollection(formData).unwrap();
      handleClose();
    } catch (err: any) {
      setError(err.data?.message || 'A apărut o eroare');
    }
  };

  const handleClose = () => {
    setSelectedParkingLotId('');
    setFormData({
      parkingLotId: '',
      paymentMachineId: '',
      amount: 0,
      notes: '',
    });
    setError(null);
    onClose();
  };

  const isLoading = lotsLoading;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>Înregistrează Ridicare Numerar</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress />
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <FormControl fullWidth required>
              <InputLabel>Parcarea</InputLabel>
              <Select
                value={selectedParkingLotId}
                label="Parcarea"
                onChange={(e) => setSelectedParkingLotId(e.target.value)}
              >
                {parkingLots.map((lot) => (
                  <MenuItem key={lot.id} value={lot.id}>
                    {lot.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required disabled={!selectedParkingLotId || machinesLoading}>
              <InputLabel>Automatul de Plată</InputLabel>
              <Select
                value={formData.paymentMachineId}
                label="Automatul de Plată"
                onChange={(e) => setFormData({ ...formData, paymentMachineId: e.target.value })}
              >
                {machines.map((machine) => (
                  <MenuItem key={machine.id} value={machine.id}>
                    Automat {machine.machineNumber}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Suma ridicată"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">RON</InputAdornment>,
              }}
              inputProps={{
                min: 0,
                step: 0.01,
              }}
            />

            <TextField
              label="Note (opțional)"
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              placeholder="Observații despre ridicare..."
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={creating}>
          Anulează
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={creating || isLoading}
        >
          {creating ? <CircularProgress size={24} /> : 'Salvează'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateCollectionDialog;
