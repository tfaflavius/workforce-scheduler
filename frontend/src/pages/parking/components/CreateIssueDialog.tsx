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
  Autocomplete,
  Stack,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Box,
  Typography,
  IconButton,
  alpha,
  Slide,
  InputAdornment,
} from '@mui/material';
import {
  ReportProblem as IssueIcon,
  Close as CloseIcon,
  LocalParking as ParkingIcon,
  Build as EquipmentIcon,
  Business as CompanyIcon,
  Description as DescriptionIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';
import {
  useGetParkingLotsQuery,
  useGetEquipmentListQuery,
  useGetCompanyListQuery,
  useCreateParkingIssueMutation,
} from '../../../store/api/parking.api';
import type { CreateParkingIssueDto } from '../../../types/parking.types';

interface CreateIssueDialogProps {
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

const CreateIssueDialog: React.FC<CreateIssueDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { data: parkingLots = [], isLoading: lotsLoading } = useGetParkingLotsQuery();
  const { data: equipmentList = [], isLoading: equipmentLoading } = useGetEquipmentListQuery();
  const { data: companyList = [], isLoading: companiesLoading } = useGetCompanyListQuery();

  const [createIssue, { isLoading: creating }] = useCreateParkingIssueMutation();

  const [formData, setFormData] = useState<CreateParkingIssueDto>({
    parkingLotId: '',
    equipment: '',
    contactedCompany: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!formData.parkingLotId || !formData.equipment || !formData.contactedCompany || !formData.description) {
      setError('Toate câmpurile sunt obligatorii');
      return;
    }

    try {
      await createIssue(formData).unwrap();
      handleClose();
    } catch (err: any) {
      setError(err.data?.message || 'A apărut o eroare');
    }
  };

  const handleClose = () => {
    setFormData({
      parkingLotId: '',
      equipment: '',
      contactedCompany: '',
      description: '',
    });
    setError(null);
    onClose();
  };

  const isLoading = lotsLoading || equipmentLoading || companiesLoading;

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
          background: `linear-gradient(135deg, #ef4444 0%, #f97316 100%)`,
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
            <IssueIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
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
              Adaugă Problemă Nouă
            </Typography>
            <Typography
              variant="body2"
              sx={{ opacity: 0.9, display: { xs: 'none', sm: 'block' } }}
            >
              Raportează o problemă la echipamentul parcării
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
            <CircularProgress color="warning" />
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
              options={equipmentList}
              value={formData.equipment || null}
              onChange={(_, value) => setFormData({ ...formData, equipment: value || '' })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Echipament"
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

            <Autocomplete
              options={companyList}
              value={formData.contactedCompany || null}
              onChange={(_, value) => setFormData({ ...formData, contactedCompany: value || '' })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Firma / Compartiment contactat"
                  required
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <CompanyIcon color="action" />
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

            <TextField
              label="Descrierea problemei"
              multiline
              rows={isMobile ? 3 : 4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              fullWidth
              placeholder="Descrie problema în detaliu..."
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
            bgcolor: '#ef4444',
            '&:hover': { bgcolor: '#dc2626' },
            boxShadow: `0 4px 14px ${alpha('#ef4444', 0.4)}`,
          }}
        >
          {creating ? 'Se salvează...' : 'Salvează'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateIssueDialog;
