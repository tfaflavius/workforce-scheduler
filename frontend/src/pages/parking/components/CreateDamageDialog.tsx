import React, { useState, useRef } from 'react';
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
  Autocomplete,
  Stack,
  Alert,
  CircularProgress,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  useGetParkingLotsQuery,
  useGetDamageEquipmentListQuery,
  useCreateParkingDamageMutation,
} from '../../../store/api/parking.api';
import type { CreateParkingDamageDto } from '../../../types/parking.types';
import SignatureCanvas from './SignatureCanvas';

interface CreateDamageDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateDamageDialog: React.FC<CreateDamageDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { data: parkingLots = [], isLoading: lotsLoading } = useGetParkingLotsQuery();
  const { data: equipmentList = [], isLoading: equipmentLoading } = useGetDamageEquipmentListQuery();

  const [createDamage, { isLoading: creating }] = useCreateParkingDamageMutation();

  const [formData, setFormData] = useState<CreateParkingDamageDto>({
    parkingLotId: '',
    damagedEquipment: '',
    personName: '',
    phone: '',
    carPlate: '',
    description: '',
    signatureData: '',
  });
  const [error, setError] = useState<string | null>(null);
  const signatureRef = useRef<any>(null);

  const handleSubmit = async () => {
    if (!formData.parkingLotId || !formData.damagedEquipment || !formData.personName ||
        !formData.phone || !formData.carPlate || !formData.description) {
      setError('Toate câmpurile sunt obligatorii');
      return;
    }

    // Get signature data
    const signatureData = signatureRef.current?.toDataURL() || '';

    try {
      await createDamage({
        ...formData,
        signatureData,
      }).unwrap();
      handleClose();
    } catch (err: any) {
      setError(err.data?.message || 'A apărut o eroare');
    }
  };

  const handleClose = () => {
    setFormData({
      parkingLotId: '',
      damagedEquipment: '',
      personName: '',
      phone: '',
      carPlate: '',
      description: '',
      signatureData: '',
    });
    setError(null);
    signatureRef.current?.clear();
    onClose();
  };

  const isLoading = lotsLoading || equipmentLoading;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>Înregistrează Prejudiciu</DialogTitle>
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
                value={formData.parkingLotId}
                label="Parcarea"
                onChange={(e) => setFormData({ ...formData, parkingLotId: e.target.value })}
              >
                {parkingLots.map((lot) => (
                  <MenuItem key={lot.id} value={lot.id}>
                    {lot.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              options={equipmentList}
              value={formData.damagedEquipment || null}
              onChange={(_, value) => setFormData({ ...formData, damagedEquipment: value || '' })}
              renderInput={(params) => (
                <TextField {...params} label="Echipament avariat" required />
              )}
              freeSolo
            />

            <TextField
              label="Numele persoanei"
              value={formData.personName}
              onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
              required
              fullWidth
            />

            <TextField
              label="Telefon"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              fullWidth
            />

            <TextField
              label="Număr de Mașină"
              value={formData.carPlate}
              onChange={(e) => setFormData({ ...formData, carPlate: e.target.value.toUpperCase() })}
              required
              fullWidth
              placeholder="Ex: BH-01-ABC"
            />

            <TextField
              label="Descriere prejudiciu"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              fullWidth
            />

            {/* Signature */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Semnătura contravenientului
              </Typography>
              <SignatureCanvas ref={signatureRef} />
              <Button
                size="small"
                onClick={() => signatureRef.current?.clear()}
                sx={{ mt: 1 }}
              >
                Șterge semnătura
              </Button>
            </Box>
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

export default CreateDamageDialog;
