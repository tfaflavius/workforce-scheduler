import React, { useState, useEffect } from 'react';
import {
  Stack,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AccountBalance as CashIcon,
  LocalParking as ParkingIcon,
  PointOfSale as MachineIcon,
  AttachMoney as MoneyIcon,
  Notes as NotesIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  FriendlyDialog,
  FriendlySelect,
  FriendlyTextField,
  FriendlyAlert,
  FriendlyButton,
} from '../../../components/common';
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
      setError('Toate campurile sunt obligatorii si suma trebuie sa fie pozitiva');
      return;
    }

    try {
      await createCollection(formData).unwrap();
      handleClose();
    } catch (err: any) {
      setError(err.data?.message || 'A aparut o eroare');
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

  // Convert parking lots to select options
  const parkingOptions = parkingLots.map((lot) => ({
    value: lot.id,
    label: lot.name,
    icon: <ParkingIcon />,
  }));

  // Convert machines to select options
  const machineOptions = machines.map((machine) => ({
    value: machine.id,
    label: `Automat ${machine.machineNumber}`,
    icon: <MachineIcon />,
  }));

  const selectedParkingLot = parkingLots.find(l => l.id === selectedParkingLotId);

  return (
    <FriendlyDialog
      open={open}
      onClose={handleClose}
      title="Inregistreaza Ridicare Numerar"
      subtitle="Golirea automatului de plata"
      icon={<CashIcon />}
      variant="success"
      maxWidth="sm"
      loading={lotsLoading}
      loadingText="Se incarca datele..."
      actions={
        <Stack direction="row" spacing={1.5} sx={{ width: '100%', justifyContent: 'flex-end' }}>
          <FriendlyButton
            colorVariant="ghost"
            onClick={handleClose}
            disabled={creating}
          >
            Anuleaza
          </FriendlyButton>
          <FriendlyButton
            colorVariant="success"
            onClick={handleSubmit}
            loading={creating}
            loadingText="Se salveaza..."
            icon={<SaveIcon />}
            disabled={lotsLoading}
          >
            Salveaza
          </FriendlyButton>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        {error && (
          <FriendlyAlert
            severity="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        {/* Parking & Machine row */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FriendlySelect
            label="Parcarea"
            value={selectedParkingLotId}
            onChange={(e) => setSelectedParkingLotId(e.target.value as string)}
            options={parkingOptions}
            startIcon={<ParkingIcon />}
            required
          />

          <FriendlySelect
            label="Automatul de Plata"
            value={formData.paymentMachineId}
            onChange={(e) => setFormData({ ...formData, paymentMachineId: e.target.value as string })}
            options={machineOptions}
            startIcon={<MachineIcon />}
            required
            disabled={!selectedParkingLotId || machinesLoading}
            hint={machinesLoading ? 'Se incarca automatele...' : machines.length === 0 && selectedParkingLotId ? 'Nu exista automate' : undefined}
          />
        </Stack>

        <FriendlyTextField
          label="Suma ridicata"
          type="number"
          value={formData.amount || ''}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          required
          fullWidth
          startIcon={<MoneyIcon />}
          endIcon={
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: 'success.main',
                bgcolor: alpha(theme.palette.success.main, 0.1),
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              RON
            </Typography>
          }
          InputProps={{
            inputProps: {
              min: 0,
              step: 0.01,
            },
          }}
          sx={{
            '& input': { fontSize: '1.2rem', fontWeight: 600 },
          }}
        />

        <FriendlyTextField
          label="Note (optional)"
          multiline
          rows={2}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          fullWidth
          placeholder="Observatii despre ridicare..."
          startIcon={<NotesIcon />}
        />

        {/* Summary */}
        {formData.amount > 0 && (
          <FriendlyAlert
            severity="success"
            icon={<CashIcon />}
            message={`Vei inregistra o ridicare de ${formData.amount.toLocaleString('ro-RO', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} RON${selectedParkingLot ? ` de la ${selectedParkingLot.name}` : ''}`}
          />
        )}
      </Stack>
    </FriendlyDialog>
  );
};

export default CreateCollectionDialog;
