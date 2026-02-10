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
  Box,
  Typography,
  IconButton,
  alpha,
  Slide,
} from '@mui/material';
import {
  AccountBalance as CashIcon,
  Close as CloseIcon,
  LocalParking as ParkingIcon,
  PointOfSale as MachineIcon,
  AttachMoney as MoneyIcon,
  Notes as NotesIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';
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

// Slide transition for mobile
const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

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
          background: `linear-gradient(135deg, #10b981 0%, #059669 100%)`,
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
            <CashIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
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
              Înregistrează Ridicare Numerar
            </Typography>
            <Typography
              variant="body2"
              sx={{ opacity: 0.9, display: { xs: 'none', sm: 'block' } }}
            >
              Golirea automatului de plată
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
            <CircularProgress color="success" />
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

            {/* Parking & Machine row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>Parcarea</InputLabel>
                <Select
                  value={selectedParkingLotId}
                  label="Parcarea"
                  onChange={(e) => setSelectedParkingLotId(e.target.value)}
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

              <FormControl fullWidth required disabled={!selectedParkingLotId || machinesLoading}>
                <InputLabel>Automatul de Plată</InputLabel>
                <Select
                  value={formData.paymentMachineId}
                  label="Automatul de Plată"
                  onChange={(e) => setFormData({ ...formData, paymentMachineId: e.target.value })}
                  startAdornment={
                    <InputAdornment position="start">
                      <MachineIcon color="action" sx={{ ml: 1 }} />
                    </InputAdornment>
                  }
                  sx={{
                    '& .MuiSelect-select': { pl: 1 },
                    borderRadius: 2,
                  }}
                >
                  {machinesLoading ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} /> Se încarcă...
                    </MenuItem>
                  ) : machines.length === 0 ? (
                    <MenuItem disabled>Nu există automate</MenuItem>
                  ) : (
                    machines.map((machine) => (
                      <MenuItem key={machine.id} value={machine.id}>
                        Automat {machine.machineNumber}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Suma ridicată"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
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
                  </InputAdornment>
                ),
              }}
              inputProps={{
                min: 0,
                step: 0.01,
              }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2 },
                '& input': { fontSize: '1.2rem', fontWeight: 600 },
              }}
            />

            <TextField
              label="Note (opțional)"
              multiline
              rows={isMobile ? 2 : 2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              placeholder="Observații despre ridicare..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                    <NotesIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2 },
                '& .MuiInputBase-inputMultiline': { pl: 1 },
              }}
            />

            {/* Summary */}
            {formData.amount > 0 && (
              <Alert
                severity="success"
                icon={<CashIcon />}
                sx={{ borderRadius: 2 }}
              >
                <Typography variant="body2">
                  Vei înregistra o ridicare de{' '}
                  <strong>
                    {formData.amount.toLocaleString('ro-RO', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    RON
                  </strong>
                  {selectedParkingLotId && parkingLots.find(l => l.id === selectedParkingLotId) && (
                    <>
                      {' '}de la <strong>{parkingLots.find(l => l.id === selectedParkingLotId)?.name}</strong>
                    </>
                  )}
                </Typography>
              </Alert>
            )}
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
            bgcolor: '#10b981',
            '&:hover': { bgcolor: '#059669' },
            boxShadow: `0 4px 14px ${alpha('#10b981', 0.4)}`,
          }}
        >
          {creating ? 'Se salvează...' : 'Salvează'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateCollectionDialog;
