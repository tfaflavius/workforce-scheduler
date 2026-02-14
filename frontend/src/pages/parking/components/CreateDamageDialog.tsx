import React, { useState, useRef } from 'react';
import {
  Stack,
  Typography,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Warning as DamageIcon,
  LocalParking as ParkingIcon,
  Build as EquipmentIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  DirectionsCar as CarIcon,
  Description as DescriptionIcon,
  Save as SaveIcon,
  Gesture as SignatureIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  FriendlyDialog,
  FriendlySelect,
  FriendlyAutocomplete,
  FriendlyTextField,
  FriendlyAlert,
  FriendlyButton,
} from '../../../components/common';
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
      setError('Toate campurile sunt obligatorii');
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
      setError(err.data?.message || 'A aparut o eroare');
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

  // Convert parking lots to select options
  const parkingOptions = parkingLots.map((lot) => ({
    value: lot.id,
    label: lot.name,
    icon: <ParkingIcon />,
  }));

  return (
    <FriendlyDialog
      open={open}
      onClose={handleClose}
      title="Inregistreaza Prejudiciu"
      subtitle="Documenteaza avarierea echipamentului"
      icon={<DamageIcon />}
      variant="error"
      maxWidth="sm"
      loading={isLoading}
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
            colorVariant="error"
            onClick={handleSubmit}
            loading={creating}
            loadingText="Se salveaza..."
            icon={<SaveIcon />}
            disabled={isLoading}
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

        {/* Parking & Equipment row */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FriendlySelect
            label="Parcarea"
            value={formData.parkingLotId}
            onChange={(e) => setFormData({ ...formData, parkingLotId: e.target.value as string })}
            options={parkingOptions}
            startIcon={<ParkingIcon />}
            required
          />

          <Box sx={{ flex: 1 }}>
            <FriendlyAutocomplete
              label="Echipament avariat"
              options={equipmentList}
              value={formData.damagedEquipment || null}
              onChange={(value) => setFormData({ ...formData, damagedEquipment: value || '' })}
              startIcon={<EquipmentIcon />}
              freeSolo
              required
            />
          </Box>
        </Stack>

        {/* Person info row */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FriendlyTextField
            label="Numele persoanei"
            value={formData.personName}
            onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
            required
            fullWidth
            startIcon={<PersonIcon />}
          />

          <FriendlyTextField
            label="Telefon"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            fullWidth
            startIcon={<PhoneIcon />}
          />
        </Stack>

        <FriendlyTextField
          label="Numar de Masina"
          value={formData.carPlate}
          onChange={(e) => setFormData({ ...formData, carPlate: e.target.value.toUpperCase() })}
          required
          fullWidth
          placeholder="Ex: BH-01-ABC"
          startIcon={<CarIcon />}
        />

        <FriendlyTextField
          label="Descriere prejudiciu"
          multiline
          rows={isMobile ? 2 : 3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          fullWidth
          placeholder="Descrie prejudiciul in detaliu..."
          startIcon={<DescriptionIcon />}
          characterLimit={500}
        />

        {/* Signature */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 3,
            borderColor: alpha(theme.palette.divider, 0.5),
            bgcolor: alpha(theme.palette.background.default, 0.3),
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: theme.palette.primary.main,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
            },
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: 'warning.main',
                  display: 'flex',
                }}
              >
                <SignatureIcon />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Semnatura contravenientului
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Deseneaza semnatura in spatiul de mai jos
                </Typography>
              </Box>
            </Stack>
            <FriendlyButton
              colorVariant="error"
              variant="outlined"
              size="small"
              onClick={() => signatureRef.current?.clear()}
              icon={<DeleteIcon />}
            >
              Sterge
            </FriendlyButton>
          </Stack>
          <Box
            sx={{
              border: `2px dashed ${alpha(theme.palette.divider, 0.5)}`,
              borderRadius: 2.5,
              overflow: 'hidden',
              bgcolor: theme.palette.background.paper,
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: theme.palette.primary.main,
              },
            }}
          >
            <SignatureCanvas ref={signatureRef} />
          </Box>
        </Paper>
      </Stack>
    </FriendlyDialog>
  );
};

export default CreateDamageDialog;
