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
  IconButton,
  alpha,
  Slide,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  Warning as DamageIcon,
  Close as CloseIcon,
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
import type { TransitionProps } from '@mui/material/transitions';
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

// Slide transition for mobile
const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

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
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={isMobile ? SlideTransition : undefined}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* Header with gradient */}
      <Box
        sx={{
          background: `linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)`,
          color: 'white',
          position: 'relative',
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: { xs: 2, sm: 2.5 },
            pr: 6,
          }}
        >
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
            }}
          >
            <DamageIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
              }}
            >
              Înregistrează Prejudiciu
            </Typography>
            <Typography
              variant="body2"
              sx={{ opacity: 0.9, display: { xs: 'none', sm: 'block' } }}
            >
              Documentează avarierea echipamentului
            </Typography>
          </Box>
        </DialogTitle>
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.1)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {isLoading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress color="error" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Se încarcă datele...
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={{ xs: 2, sm: 2.5 }}>
            {error && (
              <Alert
                severity="error"
                onClose={() => setError(null)}
                sx={{ borderRadius: 2 }}
              >
                {error}
              </Alert>
            )}

            {/* Parking & Equipment row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>Parcarea</InputLabel>
                <Select
                  value={formData.parkingLotId}
                  label="Parcarea"
                  onChange={(e) => setFormData({ ...formData, parkingLotId: e.target.value })}
                  startAdornment={
                    <InputAdornment position="start">
                      <ParkingIcon color="action" sx={{ ml: 1 }} />
                    </InputAdornment>
                  }
                  sx={{
                    '& .MuiSelect-select': { pl: 1 },
                    borderRadius: 2,
                  }}
                >
                  {parkingLots.map((lot) => (
                    <MenuItem key={lot.id} value={lot.id}>
                      {lot.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Autocomplete
                fullWidth
                options={equipmentList}
                value={formData.damagedEquipment || null}
                onChange={(_, value) => setFormData({ ...formData, damagedEquipment: value || '' })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Echipament avariat"
                    required
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <EquipmentIcon color="action" />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
                freeSolo
              />
            </Stack>

            {/* Person info row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Numele persoanei"
                value={formData.personName}
                onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />

              <TextField
                label="Telefon"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Stack>

            <TextField
              label="Număr de Mașină"
              value={formData.carPlate}
              onChange={(e) => setFormData({ ...formData, carPlate: e.target.value.toUpperCase() })}
              required
              fullWidth
              placeholder="Ex: BH-01-ABC"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CarIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Descriere prejudiciu"
              multiline
              rows={isMobile ? 2 : 3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              fullWidth
              placeholder="Descrie prejudiciul în detaliu..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                    <DescriptionIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2 },
                '& .MuiInputBase-inputMultiline': { pl: 1 },
              }}
            />

            {/* Signature */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                borderColor: alpha(theme.palette.divider, 0.5),
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <SignatureIcon color="action" />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Semnătura contravenientului
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => signatureRef.current?.clear()}
                  sx={{ borderRadius: 2 }}
                >
                  Șterge
                </Button>
              </Stack>
              <Box
                sx={{
                  border: `1px dashed ${theme.palette.divider}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                }}
              >
                <SignatureCanvas ref={signatureRef} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Desenează semnătura în spațiul de mai sus
              </Typography>
            </Paper>
          </Stack>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          gap: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.default, 0.5),
        }}
      >
        <Button
          onClick={handleClose}
          disabled={creating}
          sx={{
            px: 3,
            borderRadius: 2,
          }}
        >
          Anulează
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={creating || isLoading}
          startIcon={creating ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          sx={{
            px: 3,
            borderRadius: 2,
            bgcolor: '#dc2626',
            '&:hover': { bgcolor: '#b91c1c' },
            boxShadow: `0 4px 14px ${alpha('#dc2626', 0.4)}`,
          }}
        >
          {creating ? 'Se salvează...' : 'Salvează'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDamageDialog;
